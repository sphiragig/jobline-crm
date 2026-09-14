# Jobline: AI Feature Plan

## AI principle

AI is an optional assistant, not an autonomous decision-maker. The existing manual workflow remains available.

Every AI interaction follows:

**Start AI action → Preview proposal → Review or edit → User approves → Confirmation**

AI must not create a job, assign a technician, change a status, or send a customer message without explicit user approval.

## Recommended demo feature: inline AI next action

Add a **Suggested action** column to the Job Queue or My Jobs table. The suggestion changes according to the job and the active role.

### Manager suggestions

- Assign Dana and schedule 9–11 AM.
- Reassign a scheduled job to Marcus.
- Review a blocked job.
- Request missing customer information.

For an unassigned job, AI can prepare several related updates together:

- Select a technician.
- Change the stage to Scheduled.
- Select a date and time window.
- Add an assignment activity entry.

The confirmation popover shows:

- The recommendation.
- Why it was recommended.
- Every field that will change.
- Editable values.
- **Confirm** and **Open details** actions.

### Technician suggestions

- Start job.
- Report blocked.
- Complete with summary.
- Add a visit summary.
- Prepare a customer update.

For **Complete with summary**, AI prepares:

- A work summary based on job notes.
- Stage change to Done.
- Completion date and time.
- Customer-history activity.
- An editable customer-update draft.

Sending the customer message remains a separate explicit action.

## AI technician recommendation

When a manager assigns a job, AI can recommend a technician using simulated factors:

- Required job skills.
- Availability.
- Current workload.
- Approximate location fit.

The interface should explain the recommendation in plain language, for example:

> Dana is HVAC-qualified, has availability in this time window, is working nearby, and currently has the lightest workload.

The manager can accept the recommendation or choose someone else.

## AI-assisted job creation

Inside the New Job dialog, provide two paths:

- Enter manually.
- Create from request with AI.

The manager can paste a call summary or customer request. AI prepares the form and visibly marks:

- Extracted information.
- Missing required fields.
- Uncertain values that require confirmation.

All fields remain editable before **Create reviewed job** is selected.

## AI job summary

An optional action in the job drawer can prepare:

- Current situation.
- Assignment and schedule.
- Recent activity and notes.
- Customer preferences.
- Suggested next action.
- Editable customer-update draft.

This can be presented as a future enhancement if it is not part of the primary demo.

## Future command field

An **Ask Jobline** field above the table could support requests such as:

> Assign today's unassigned HVAC jobs based on availability.

AI would return a review table with a separate recommendation for every job. The manager could edit individual assignments before approving the batch.

## Recommended implementation scope

Implement these two contextual actions for the presentation:

1. Manager: **Assign and schedule** from one table suggestion.
2. Technician: **Complete with summary** from one table suggestion.

Show AI-assisted job creation or the Ask Jobline command as a designed future concept if time is limited.

## Expected and testable value

Suggested presentation statement:

> Jobline's inline AI prepares several related updates from the user's current context. We expect it to reduce a five-to-seven-step assignment workflow to one review-and-confirm action while preserving human control. This is a product hypothesis that should be validated through usability testing.

Suggested measures:

- Time required to create and assign a job.
- Number of interactions per workflow.
- Missing-field and correction rate.
- Recommendation acceptance rate.
- Time spent updating completed-job documentation.
- Dispatcher and technician confidence.

Do not present time savings as proven until they are validated with actual user data.
