"use client";

import { getLocalTimeZone, today } from "@internationalized/date";
import { useState } from "react";
import type { DateValue } from "react-aria-components";

import { Calendar } from "@/components/ui/calendar-rac";

export default function Component() {
  const [date, setDate] = useState<DateValue | null>(today(getLocalTimeZone()));

  return (
    <div>
      <Calendar
        className="rounded-md border p-2"
        onChange={setDate}
        value={date}
      />
      <p
        aria-live="polite"
        className="mt-4 text-center text-muted-foreground text-xs"
        role="region"
      >
        Calendar -{" "}
        <a
          className="underline hover:text-foreground"
          href="https://react-spectrum.adobe.com/react-aria/DateRangePicker.html"
          rel="noreferrer noopener nofollow"
          target="_blank"
        >
          React Aria
        </a>
      </p>
    </div>
  );
}
