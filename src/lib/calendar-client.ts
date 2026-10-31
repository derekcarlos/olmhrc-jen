import {
  manilaToday,
  monthDays,
  occurrencesForMonth,
  formatEventDay,
  formatEventTime,
  parseCalendarMonth,
  nextSevenDays,
  liturgicalCycleForMonth,
  type CalendarEvent,
} from "./calendar.mjs";
import {
  createLiturgicalYearLoader,
  type LiturgicalYearData,
} from "./calendar-data-client.mjs";

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text = "",
  className = "",
) {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = className;
  return node;
}

export function prepareCalendars() {
  document
    .querySelectorAll<HTMLElement>("[data-chapel-calendar]")
    .forEach((root) => {
      if (root.dataset.ready) return;
      root.dataset.ready = "true";
      const events: CalendarEvent[] = JSON.parse(root.dataset.events || "[]");
      const seed: LiturgicalYearData = JSON.parse(root.dataset.liturgicalYear!);
      const yearLoader = createLiturgicalYearLoader(
        root.dataset.liturgicalBase!,
        seed,
      );
      const liturgicalYears = new Map([[seed.year, seed.events]]);
      const pendingYears = new Set<number>();
      const dataState = root.querySelector<HTMLElement>(
        "[data-calendar-data-state]",
      )!;
      const dataStatus = root.querySelector<HTMLElement>(
        "[data-calendar-data-status]",
      )!;
      const retry = root.querySelector<HTMLButtonElement>(
        "[data-calendar-data-retry]",
      )!;
      const title = root.querySelector<HTMLElement>("[data-calendar-title]")!;
      const cycleLabel = root.querySelector<HTMLElement>(
        "[data-calendar-cycle]",
      )!;
      const caption = root.querySelector<HTMLElement>(
        "[data-calendar-caption]",
      )!;
      const picker = root.querySelector<HTMLInputElement>(
        "[data-calendar-month]",
      )!;
      const previous = root.querySelector<HTMLButtonElement>(
        "[data-calendar-prev]",
      )!;
      const next = root.querySelector<HTMLButtonElement>(
        "[data-calendar-next]",
      )!;
      const days = root.querySelector<HTMLTableSectionElement>(
        "[data-calendar-days]",
      )!;
      const agenda = root.querySelector<HTMLElement>("[data-calendar-agenda]")!;
      const count = root.querySelector<HTMLElement>("[data-calendar-count]")!;
      const dialog = root.querySelector<HTMLDialogElement>(
        "[data-calendar-dialog]",
      )!;
      const templates = new Map(
        [
          ...root.querySelectorAll<HTMLTemplateElement>(
            "[data-event-template]",
          ),
        ].map((template) => [template.dataset.eventTemplate, template]),
      );
      const icons = new Map(
        [
          ...root.querySelectorAll<HTMLTemplateElement>("[data-calendar-icon]"),
        ].map((template) => [template.dataset.calendarIcon, template]),
      );
      const categoryLabels: Record<string, string> = {
        general: "General",
        mass: "Mass",
        novena: "Novena",
        feast: "Feast day",
        solemnity: "Solemnity",
        memorial: "Memorial",
        advent: "Advent",
        christmas: "Christmas",
        lent: "Lent",
        "holy-week": "Holy Week",
        easter: "Easter",
      };
      function icon(name: string) {
        return (icons.get(name) || icons.get("general"))!.content.cloneNode(
          true,
        );
      }
      let year = Number(manilaToday().slice(0, 4));
      let month = Number(manilaToday().slice(5, 7)) - 1;
      let occurrences = occurrencesForMonth(events, year, month);
      let upcoming = nextSevenDays(events);
      let opener: HTMLButtonElement | null = null;

      function eventButton(event: (typeof occurrences)[number], grid: boolean) {
        const button = element(
          "button",
          "",
          grid ? "calendar-grid-event" : "calendar-agenda-event",
        );
        button.type = "button";
        button.dataset.occurrence = `${event.id}:${event.day}`;
        button.setAttribute("aria-haspopup", "dialog");
        button.setAttribute(
          "aria-label",
          `${event.title}, ${formatEventDay(event.day)}, ${formatEventTime(event.time, event.all_day)}. View details`,
        );
        const category = icons.has(event.category || "")
          ? event.category!
          : "general";
        button.dataset.category = category;
        button.title = `${event.title} · ${formatEventTime(event.time, event.all_day)}`;
        if (grid) {
          button.append(icon(category));
          return button;
        }
        const content = element("span");
        const meta = element("span", "", "calendar-event-meta");
        meta.append(
          icon(category),
          element(
            "span",
            `${new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${event.day}T12:00:00Z`))} — ${categoryLabels[category]}`,
          ),
        );
        content.append(meta, element("strong", event.title));
        const time = element(
          "time",
          formatEventTime(event.time, event.all_day),
        );
        if (event.time && !event.all_day)
          time.dateTime = `${event.day}T${event.time}:00+08:00`;
        const timeRow = element("span", "", "calendar-event-info");
        timeRow.append(icon("clock"), time);
        content.append(timeRow);
        if (event.location) {
          const location = element("span", "", "calendar-event-info");
          location.append(icon("location"), element("span", event.location));
          content.append(location);
        }
        button.append(content);
        return button;
      }

      function draw() {
        const liturgicalEvents = liturgicalYears.get(year);
        occurrences = occurrencesForMonth(
          [...events, ...(liturgicalEvents || [])],
          year,
          month,
        );
        dataState.hidden = !!liturgicalEvents;
        if (!liturgicalEvents) loadSelectedYear();
        const label = new Intl.DateTimeFormat("en-PH", {
          year: "numeric",
          month: "long",
          timeZone: "UTC",
        }).format(new Date(Date.UTC(year, month, 1)));
        title.textContent = label;
        const cycle = liturgicalCycleForMonth(year, month);
        cycleLabel.textContent = cycle.label;
        cycleLabel.title = cycle.description;
        cycleLabel.setAttribute("aria-label", cycle.description);
        caption.textContent = `Chapel events for ${label}`;
        picker.value = `${year}-${String(month + 1).padStart(2, "0")}`;
        previous.disabled = year === 1900 && month === 0;
        next.disabled = year === 2100 && month === 11;
        days.replaceChildren();
        agenda.replaceChildren();
        const gridDays = monthDays(year, month);
        for (let offset = 0; offset < gridDays.length; offset += 7) {
          const row = element("tr");
          for (const day of gridDays.slice(offset, offset + 7)) {
            const cell = element("td");
            const inMonth = day.startsWith(picker.value);
            if (!inMonth) cell.className = "calendar-other-month";
            const number = element(
              "time",
              String(Number(day.slice(-2))),
              "calendar-day-number",
            );
            number.dateTime = day;
            number.setAttribute("aria-label", formatEventDay(day));
            if (day === manilaToday())
              number.setAttribute("aria-current", "date");
            cell.append(number);
            const markers = element("div", "", "calendar-markers");
            if (inMonth)
              for (const event of occurrences.filter(
                (event) => event.day === day,
              ))
                markers.append(eventButton(event, true));
            cell.append(markers);
            row.append(cell);
          }
          days.append(row);
        }
        upcoming = nextSevenDays(events);
        count.textContent = `Next 7 days · ${upcoming.length} ${upcoming.length === 1 ? "event" : "events"}`;
        if (!upcoming.length)
          agenda.append(
            element(
              "p",
              "No events scheduled in the next 7 days. Please check back for chapel announcements.",
              "calendar-empty",
            ),
          );
        for (const day of [...new Set(upcoming.map((event) => event.day))]) {
          const group = element("div", "", "calendar-agenda-day");
          group.append(
            element("h3", formatEventDay(day), "calendar-agenda-date"),
          );
          for (const event of upcoming.filter((event) => event.day === day))
            group.append(eventButton(event, false));
          agenda.append(group);
        }
      }

      function loadSelectedYear() {
        const requestedYear = year;
        if (pendingYears.has(requestedYear)) return;
        pendingYears.add(requestedYear);
        dataState.hidden = false;
        dataStatus.textContent = "Loading liturgical observances…";
        retry.hidden = true;
        yearLoader
          .load(requestedYear)
          .then((data) => {
            liturgicalYears.set(requestedYear, data.events);
            pendingYears.delete(requestedYear);
            // A delayed response must never switch the visitor back to an old year.
            if (year === requestedYear) draw();
          })
          .catch(() => {
            pendingYears.delete(requestedYear);
            if (year !== requestedYear) return;
            dataState.hidden = false;
            dataStatus.textContent =
              "Liturgical observances could not be loaded. Chapel events are still shown.";
            retry.hidden = false;
          });
      }
      retry.addEventListener("click", loadSelectedYear);

      previous.addEventListener("click", () => {
        if (month === 0) {
          year--;
          month = 11;
        } else month--;
        draw();
      });
      next.addEventListener("click", () => {
        if (month === 11) {
          year++;
          month = 0;
        } else month++;
        draw();
      });
      root
        .querySelector("[data-calendar-today]")!
        .addEventListener("click", () => {
          const today = manilaToday();
          year = Number(today.slice(0, 4));
          month = Number(today.slice(5, 7)) - 1;
          draw();
        });
      picker.addEventListener("change", () => {
        const selected = parseCalendarMonth(picker.value);
        if (!picker.validity.valid || !selected) {
          draw();
          return;
        }
        year = selected.year;
        month = selected.month;
        draw();
      });
      root.addEventListener("click", (event) => {
        const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
          "button[data-occurrence]",
        );
        if (!button) return;
        const occurrence = [...occurrences, ...upcoming].find(
          (item) => `${item.id}:${item.day}` === button.dataset.occurrence,
        );
        if (!occurrence) return;
        opener = button;
        root.querySelector("[data-event-title]")!.textContent =
          occurrence.title;
        root.querySelector("[data-event-date]")!.textContent = formatEventDay(
          occurrence.day,
        );
        root.querySelector("[data-event-time]")!.textContent =
          `${formatEventTime(occurrence.time, occurrence.all_day)}${occurrence.time && !occurrence.all_day ? " · Philippine Time" : ""}`;
        root.querySelector("[data-event-location]")!.textContent =
          occurrence.location || "";
        root
          .querySelector("[data-event-body]")!
          .replaceChildren(
            templates.get(occurrence.id)?.content.cloneNode(true) ||
              document.createTextNode(occurrence.description || ""),
          );
        dialog.showModal();
      });
      dialog.addEventListener("close", () =>
        opener?.focus({ preventScroll: true }),
      );
      draw();
      root.querySelector<HTMLElement>("[data-calendar-interface]")!.hidden =
        false;
      root.querySelector<HTMLElement>("[data-calendar-fallback]")!.hidden =
        true;
    });
}
