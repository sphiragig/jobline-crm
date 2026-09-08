# Jobline: Persona and Product Changes

## Objective

Present one clear service workflow while showing that Jobline adapts to different responsibilities:

**Job request → Create job → Assign technician → Track progress → View customer history**

This remains a desktop-first concept. The role behavior can be simulated in the browser and does not require production authentication.

## Demo sign-in

Add a simple opening screen with two role choices:

### Manager / Dispatcher

- View the complete Job Queue and Dispatch Board.
- Create and assign jobs.
- Bulk assign different jobs to different technicians.
- Reassign scheduled jobs that have not started.
- Change eligible job statuses.
- View all customers and job history.

### Technician

- View only jobs assigned to the signed-in technician.
- Open relevant job and customer details.
- Start work, report a blocker, or mark work complete.
- Add job notes and visit details.
- Cannot create jobs, bulk assign, or reassign technicians.
- Cannot view unrelated technicians' work or customer records.

## Navigation and screen changes

### Sign-in screen

- Jobline logo and short product description.
- Role cards for Manager / Dispatcher and Technician.
- A demo name selection for the technician role.
- Clear **Continue** action.

### Application header

- Display the active role and user.
- Add a **Switch role** action for the presentation.

### Manager Job Queue

- Retain New Job, Bulk Assign, filters, sorting, search, inline editing, and the job drawer.
- Retain the complete Dispatch Board and customer views.

### Technician My Jobs

- Rename the page to **My Jobs**.
- Filter the data to the active technician automatically.
- Show only relevant status filters and actions.
- Hide management actions rather than deleting them from the code.
- Make the main row actions **Start job**, **Report blocked**, **Add note**, and **Complete job**.

### Permissions and validation

- A manager may change assignments and schedules.
- An in-progress job cannot be reassigned until its status is changed appropriately.
- A technician may update only an assigned job.
- Completed work remains visible in customer history.
- Queue, drawer, Dispatch Board, customer card, and customer detail must read the same saved job data.

## Presentation flow

1. Enter as Manager / Dispatcher.
2. Create a job from a customer request.
3. Assign and schedule a technician.
4. Show the job on the Dispatch Board.
5. Switch to the assigned technician.
6. Open My Jobs, add a note, and update progress.
7. Switch back to the manager.
8. Show the synchronized status and customer history.

## Design and accessibility

- Desktop-first layout with responsive safeguards.
- Fluent-inspired Segoe UI typography, spacing, data-grid, drawer, dialog, badges, and interaction states.
- Logical heading structure and descriptive labels.
- Visible keyboard focus states.
- Status communicated by text as well as color.
- High-contrast and reduced-motion support.

## Out of scope

- Production authentication and authorization.
- User administration.
- Backend APIs and real-time collaboration.
- Payments and unfinished actions not required in the demo.

