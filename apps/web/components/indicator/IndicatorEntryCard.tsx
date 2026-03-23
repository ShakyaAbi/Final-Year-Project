import React from "react";
import { Indicator, IndicatorValue, Project } from "../../types";
import { IndicatorCardHeader } from "./IndicatorCardHeader";
import { DataEntryFields } from "./DataEntryFields";
import { RecentSubmissionsList } from "./RecentSubmissionsList";

interface IndicatorEntryCardProps {
  indicator: Indicator;
  projectName: string;
  lastValue: string;
  formatCategoryValue: (value: any, indicator: Indicator) => string;
  entry: any;
  handleEntryChange: (id: string, field: string, value: string) => void;
  handleCategoryToggle: (id: string, catId: string, multiple: boolean) => void;
  handleFileSelect: (id: string, file: File) => void;
  handleRemoveFile: (id: string) => void;
  handleAutoFillPdf: (id: string, file: File) => void;
  handleSubmit: (id: string) => void;
  parsingPdfId: string | null;
  draggingId: string | null;
  handleDragOver: (e: React.DragEvent, id: string) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, id: string) => void;
  submissions: IndicatorValue[];
  selectedSubmissionIds: Set<string>;
  toggleSelectedSubmission: (id: string, checked: boolean) => void;
  editingSubmissionRows: Record<string, any>;
  setEditingSubmissionRows: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  canModifySubmission: (row: IndicatorValue) => boolean;
  beginEditSubmission: (indicatorId: string, row: IndicatorValue) => void;
  cancelEditSubmission: (submissionId: string) => void;
  saveEditedSubmission: (submissionId: string) => void;
  softDeleteSubmission: (indicatorId: string, submissionId: string) => void;
  restoreSubmission: (indicatorId: string, submissionId: string) => void;
}

export const IndicatorEntryCard: React.FC<IndicatorEntryCardProps> = ({
  indicator,
  projectName,
  lastValue,
  formatCategoryValue,
  entry,
  handleEntryChange,
  handleCategoryToggle,
  handleFileSelect,
  handleRemoveFile,
  handleAutoFillPdf,
  handleSubmit,
  parsingPdfId,
  draggingId,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  submissions,
  selectedSubmissionIds,
  toggleSelectedSubmission,
  editingSubmissionRows,
  setEditingSubmissionRows,
  canModifySubmission,
  beginEditSubmission,
  cancelEditSubmission,
  saveEditedSubmission,
  softDeleteSubmission,
  restoreSubmission,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
      <IndicatorCardHeader
        indicator={indicator}
        projectName={projectName}
        lastValue={lastValue}
        formatCategoryValue={formatCategoryValue}
      />
      
      <div className="flex flex-col">
        <DataEntryFields
          indicator={indicator}
          entry={entry}
          handleEntryChange={handleEntryChange}
          handleCategoryToggle={handleCategoryToggle}
          handleFileSelect={handleFileSelect}
          handleRemoveFile={handleRemoveFile}
          handleAutoFillPdf={handleAutoFillPdf}
          handleSubmit={handleSubmit}
          parsingPdfId={parsingPdfId}
          draggingId={draggingId}
          handleDragOver={handleDragOver}
          handleDragLeave={handleDragLeave}
          handleDrop={handleDrop}
        />

        <div className="px-6 pb-6 pt-0">
          <RecentSubmissionsList
            indicator={indicator}
            submissions={submissions}
            selectedSubmissionIds={selectedSubmissionIds}
            toggleSelectedSubmission={toggleSelectedSubmission}
            editingSubmissionRows={editingSubmissionRows}
            setEditingSubmissionRows={setEditingSubmissionRows}
            canModifySubmission={canModifySubmission}
            beginEditSubmission={beginEditSubmission}
            cancelEditSubmission={cancelEditSubmission}
            saveEditedSubmission={saveEditedSubmission}
            softDeleteSubmission={softDeleteSubmission}
            restoreSubmission={restoreSubmission}
          />
        </div>
      </div>
    </div>
  );
};
