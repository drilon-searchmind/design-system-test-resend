"use client";

import { TimeTrackPageHeader } from "@/components/time/time-track-page-header";
import { TimeTrackRunner } from "@/components/time/time-track-runner";

import { CrmDialog } from "./crm-dialog";
import { useTimerModal } from "./timer-modal-context";

export function CrmTimerModal() {
  const { open, closeTimer } = useTimerModal();

  return (
    <CrmDialog open={open} onClose={closeTimer} ariaLabel="Timer">
      <div className="flex max-h-[min(92vh,920px)] flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-5 md:px-6 md:pb-8 md:pt-6">
          <TimeTrackPageHeader onClose={closeTimer} />
          <TimeTrackRunner />
        </div>
      </div>
    </CrmDialog>
  );
}
