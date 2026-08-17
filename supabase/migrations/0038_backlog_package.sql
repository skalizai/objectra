-- Backlog items gain a "Package" field -- a fixed set of 4 delivery
-- packages (not an org-editable picklist, since the values themselves
-- were specified as fixed: Package 1-4), used to group/filter the
-- register (Settings has no picklist for this, same reasoning as
-- BacklogItemStatus being a fixed enum rather than a picklist).

alter table backlog_items add column package text
  check (package in ('Package 1', 'Package 2', 'Package 3', 'Package 4'));

-- Backfill: tag the 31 items bulk-uploaded from the ShiftX backlog
-- workbook (matched by project + exact description, same set inserted
-- earlier) as Package 1.
update backlog_items
set package = 'Package 1'
where project_id = (select id from projects where name = 'ShiftX – RISE with SAP S/4 HANA Implementation')
  and description in (
    '3 Levels WF for Inventory Posting',
    'Physical Inventory Quality Update (Transaction Enhancement to Update the same Quantity)',
    'KPI ALV Report on the phases of the receiving steps',
    'MB51 Report Field Addition (Completed as Go-Live Critical)',
    'Custom Field in PR/PO Header & Item Screen – Legacy GL with Dropdown Provision (Completed as Go-Live Critical)',
    'MRP Consolidation Report',
    'Report to Search Inspection Lots based on Part Numbers plus new fields addition in the report (Fiori Report Extension)',
    'Email Notification on Completion of Inspection Lot Results Recording',
    'Email Notification for Rejected Inspection Lots in Quality',
    'Email Notification for Completion of IBD''s Quality Inspection',
    'Request from BPC-LAB that to create a transaction to update daily shift wise quality results(new custom Fiori App required to save values and on the end report also required)-Fiori App Required with RAP Report',
    'Mass Update of Quality Characteristic Records during Record Results Step (RAP Report to upload the Quality Characteristics records)',
    'Need a provision to print analytical apps',
    'The business has suggested displaying the inspector''s name along with the inspector SAP ID during the usage decision process. (Screen Enhancement required to display the name of the user on three standard screens)',
    'ZF1612 — Outgoing Payment Application with Park and Multilevel WF Approvals',
    'Auto Batch Determination for Selective Plants — Production Orders',
    'Additional Bank Details Fields in the Sales Order',
    'Sales Order Confirmation — New Form to be Designed',
    'Hide the Condition Type ''VPRS'' from the Sales Order Header and Item Screen',
    'New Down Payment Request Form copied from Existing Invoice Format with Additional Fields',
    'Product Hierarchy For Electronics',
    'Reservation Form',
    'Material Characteristics Upload Program',
    'Validation in IBD Process in case of rejection, we will not allow enter storage location',
    'Material Report - Enhancement additional texts column and MPN numbers',
    'ICPO Approval Process-Agent determination for ICPO and dynamic approver for PR Level 1',
    'Material search for Storage BIN',
    'Loan in and Loan Out Application-On save WF to trigger with dynamic level of approvers and on final level posting will be required',
    'IBD - IM - Rejection Report Enhancement',
    'EWM IBD - Rejection Report Enhancement',
    'Serial Number Automation in Material Movements'
  );
