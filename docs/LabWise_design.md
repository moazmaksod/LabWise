
The LabWise Visual Blueprint: High-Fidelity Mockups and Interactive Prototype Specification


I. The LabWise Design System: A Foundation for Consistency and Scale

A robust design system is the foundation upon which a consistent, intuitive, and scalable application is built. For a complex, mission-critical system like LabWise, this foundation is non-negotiable. It ensures that every user, regardless of their role, interacts with a cohesive and predictable interface, which limits confusion, builds trust, and reinforces the application's reliability.1 The LabWise Design System translates the official style guide into a comprehensive library of reusable components, visual styles, and interaction patterns. This system will serve as the single source of truth for the development team, accelerating the implementation process and guaranteeing a high-quality user experience that directly supports the core business objectives of error reduction and operational efficiency.2

1.1. Visual Language: The Psychology of Calm and Clarity

The visual tone of a healthcare application is not merely an aesthetic choice; it is a functional component that directly impacts the user's psychological state and performance.3 The laboratory environment is characterized by high pressure, tight deadlines, and the constant risk of burnout, making a calm, clear, and uncluttered interface essential for maintaining focus and precision.2 The LabWise color palette is deliberately chosen to foster an atmosphere of control and reduce anxiety, transforming the UI into a supportive tool for the user.

Primary Palette (Soft Teal)

The core of the visual identity is a soft teal palette. Teal combines the calming properties of blue with the renewal qualities of green, making it a revitalizing color that represents open communication and clarity of thought—attributes that are central to LabWise's mission.4
●	Primary Action Color (#008080): This deep, professional teal will be used for all primary interactive elements, such as main call-to-action buttons, active navigation links, and key icons. Its strong but not overwhelming presence guides the user's attention to the most important actions on any given screen.4
●	Supporting Tints (#66B2B2, #B2D8D8): Lighter shades of teal will be used for secondary elements, such as container backgrounds, table row highlights on hover, and less critical interactive controls. This creates a layered, monochromatic look that is serene and visually cohesive, avoiding the harshness of pure white while maintaining a clean, professional aesthetic.6

Accent and Status Palette

A structured and consistent application of color for status indicators is a critical safety feature. It allows users to scan a dense screen of information and instantly identify items that require their immediate attention. This system is designed to be accessible, using color in conjunction with icons and text to communicate meaning, thereby supporting all users, including those with color vision deficiencies.1
●	Critical/STAT (#D9534F - Coral Red): A strong but not jarring coral red is reserved exclusively for the most urgent notifications, such as STAT sample flags, critical value results, and system-critical errors. This color is used sparingly to maximize its impact and prevent user alarm fatigue.6
●	Warning (#F0AD4E - Amber Yellow): A warm amber yellow will be used for cautionary states that require user awareness but are not immediately critical. This includes overdue sample flags, low inventory alerts, and failed delta checks that are pending investigation.2
●	Informational (#428BCA - Neutral Blue): A calm, neutral blue will be used for informational messages, system tips, and successful action confirmations.
●	Success (#5CB85C - Soft Green): A clear green indicates a successful completion of a task, such as a saved record or a successful QC run.

Neutral Palette

A sophisticated range of grays provides the canvas upon which the primary and accent colors operate. This ensures high readability and a clean, uncluttered backdrop that allows the data and key actions to take center stage.
●	Primary Text (#333333): A dark gray, rather than pure black, is used for all body copy and data to reduce eye strain during long periods of use.
●	Secondary Text & Labels (#777777): A lighter gray is used for secondary information, such as field labels, helper text, and metadata, creating a clear typographic hierarchy.
●	Borders & Dividers (#DDDDDD): A very light gray is used for borders and dividers to structure content without adding visual noise.
●	Disabled States (#CCCCCC): A medium-light gray is used for the text and borders of disabled or inactive UI elements, providing a clear visual cue that they are not interactive.

1.2. Typography System: Legibility as a Safety Feature

In an application where the misinterpretation of a single character can have severe consequences, typography is a primary safety feature. The chosen font, PT Sans, is a humanist sans-serif specifically designed for high legibility in a wide range of applications, from printed documents to screen interfaces.8 Its clear, simple, and neutral character makes it an ideal choice for presenting complex laboratory data without distraction.10

Typographic Scale and Hierarchy

A consistent and logical typographic scale establishes a clear information hierarchy, guiding the user's eye through the interface and making it easier to parse complex information quickly. The scale is based on a modular system to ensure harmony and predictability across all screens.
●	H1 - Page Title: PT Sans Bold, 32px
●	H2 - Section Header: PT Sans Bold, 24px
●	H3 - Widget/Card Title: PT Sans Bold, 18px
●	Body Text/Primary Data: PT Sans Regular, 16px
●	Table Data/Input Fields: PT Sans Regular, 14px
●	Labels/Metadata: PT Sans Regular, 12px
●	Small Captions/Notes: PT Sans Caption Regular, 12px
The use of the specific PT Sans Caption variant for the smallest text sizes is a deliberate choice. This variant was designed with a larger x-height and wider letterforms, making it exceptionally legible at small sizes, which is crucial for data-dense tables and instrument logs where clarity is paramount.9 Font weights are used purposefully; Bold is reserved for titles and key data points to create emphasis, while Regular is used for all other text to maintain a calm and readable base.

1.3. Iconography Library: Universal Language for Actions

Icons serve as a universal visual language, allowing users to understand actions and concepts quickly without relying on text alone. The LabWise system will use a consistent library of line-style icons, which are chosen for their modern, clean aesthetic that reduces visual clutter and complements the open feel of the PT Sans typeface.12
Every icon in the library will be designed or curated to maintain a consistent stroke weight (e.g., 2px), corner radius, and level of detail. This visual consistency is a core tenet of good UI design, making the interface feel more professional and easier to learn.1 The library will include a comprehensive set of icons for all system actions, objects, and statuses, such as:
●	Actions: Add Patient, Print Label, Verify Result, Run QC, Edit, Delete, Search, Filter.
●	Objects: Patient, Sample, Instrument, Reagent, Report, User.
●	Statuses: STAT, Overdue, Pending, Approved, Rejected, Error.
●	Navigation: Home, Dashboard, Settings, Logout, Menu, Back, Forward.
Icons will typically be sized at 24x24 pixels for primary actions and 16x16 pixels when used inline with text or in dense tables. They will inherit the color of their parent text element by default, ensuring they integrate seamlessly into the UI's color and typographic system.15

1.4. Component Library: The Building Blocks of LabWise

The component library is the practical implementation of the design system, providing a definitive specification for every reusable UI element. This approach ensures that a button, a text field, or a data table looks and behaves identically everywhere it appears. This consistency is vital in a complex system, as it makes the user interface predictable and reduces the cognitive load on the user, allowing them to focus on their critical tasks rather than on deciphering the UI.1 The following table details the specifications for a selection of core components, serving as a contract between the design and development teams to eliminate ambiguity and ensure a high-quality, robust implementation.
Component Name	Visual Mockup / States	Color Tokens	Typography Style	Usage Notes	Accessibility Notes
Primary Button	Default, Hover, Active, Disabled, Focus states defined with visual examples.	background: #008080, text: #FFFFFF, hover-background: #006666, disabled-background: #CCCCCC	PT Sans Bold, 16px	Use for the single, primary affirmative action on a page or within a modal (e.g., 'Save', 'Submit', 'Verify').	Must have a clear, descriptive text label. If an icon is used alone, an aria-label is required.
Secondary Button	Default, Hover, Active, Disabled, Focus states defined with visual examples.	border: #008080, text: #008080, hover-background: #B2D8D8, disabled-border: #CCCCCC, disabled-text: #CCCCCC	PT Sans Regular, 16px	Use for secondary actions that are not the main goal of the page (e.g., 'Cancel', 'Export', 'Add Note').	Follows the same accessibility guidelines as the Primary Button.
Text Input Field	Default, Hover, Focus, Disabled, Error states defined with visual examples.	border: #CCCCCC, focus-border: #008080, error-border: #D9534F, text: #333333	PT Sans Regular, 14px	Used for all data entry. Must have a clear associated label positioned above the field.	The <label> element must be programmatically associated with the <input> using the for attribute.
Data Table	Header, Body Row, Hover Row, Selected Row, Striped Row states defined with visual examples.	header-background: #F5F5F5, row-border: #DDDDDD, hover-background: #B2D8D8, text: #333333	Header: PT Sans Bold, 14px. Body: PT Sans Regular, 14px	The primary component for displaying lists of data (e.g., worklists, inventory). Must support sorting and filtering.	Table must use proper semantic HTML (<thead>, <tbody>, <th>, <tr>, <td>) for screen reader compatibility.
Modal Window	Visual example of the modal layout including header, body, and footer sections.	overlay-background: rgba(0,0,0,0.5), modal-background: #FFFFFF, header-text: #333333	Header: PT Sans Bold, 18px. Body: PT Sans Regular, 16px	Use for focused tasks or critical confirmations that interrupt the main workflow (e.g., 'Confirm Deletion', 'Log Corrective Action').	Focus must be trapped within the modal when it is open. It must be dismissible with the Escape key.

II. Information Architecture and Global Navigation

The information architecture (IA) defines the underlying structure and organization of the LabWise application. A well-designed IA ensures that users can navigate the system intuitively, find the information they need, and complete their tasks with minimal effort and confusion.1 For LabWise, the IA is fundamentally role-based, acknowledging that each of the five user personas has a unique set of goals, responsibilities, and workflows as defined in the Business Requirements Document.2

2.1. Application Sitemap

The application sitemap provides a high-level visual blueprint of the entire LabWise system. It maps out every screen, illustrates the hierarchical relationships between them, and defines the primary pathways users will take to navigate through their respective workflows. This map serves as the master plan for both the UI design and the front-end development, ensuring that all parts of the application are logically connected and that no screens are designed in isolation.

2.2. Role-Based Navigation Models

A one-size-fits-all navigation model would be profoundly inefficient in a multi-persona system like LabWise. The daily tasks of a Lab Manager are entirely different from those of a Receptionist, and their primary navigation should reflect this reality.2 Best practices in modern healthcare UI design strongly advocate for tailoring the user experience to specific roles, as this reduces clutter and streamlines workflows.3
To achieve this, LabWise will implement a dynamic primary navigation system. The main navigation element will be a persistent vertical sidebar on the left side of the interface (or the right side in the RTL version). The content of this sidebar—the links to the core system modules—will be dynamically populated based on the logged-in user's assigned role. This approach ensures that users are presented only with the tools and information relevant to their job, directly applying the "workflow-first" design principle and minimizing cognitive friction.16
The navigation structure for each primary internal role is defined as follows:
●	Receptionist View:
○	Dashboard: The default landing page, featuring the appointment calendar.
○	Patient Registration: The primary workflow for creating and managing patient records.
○	Order Entry: The interface for creating new test orders.
○	Scheduling: A dedicated view of the appointment calendar.
●	Lab Technician View:
○	Dashboard (Worklist): The default landing page, showing the real-time, prioritized list of samples.
○	Accessioning: The module for receiving and logging new samples into the lab.
○	Quality Control: The interface for managing QC materials, entering results, and viewing Levey-Jennings charts.
○	Instruments: A module for viewing instrument status and accessing electronic maintenance logs.
○	Inventory Search: A read-only view of the inventory to check reagent availability.
●	Lab Manager View:
○	KPI Dashboard: The default landing page, displaying high-level operational metrics.
○	Reports & Analytics: A module for generating detailed operational and quality reports.
○	Inventory Management: The full module for managing stock, setting par levels, and approving orders.
○	Quality Assurance: A high-level view of QC performance, corrective actions, and compliance documentation.
○	User Management: The administrative module for managing user accounts and role-based permissions.
○	Audit Trail: The interface for generating comprehensive system audit logs.

2.3. Universal Elements

While the primary navigation is role-specific, certain elements must remain consistent across the entire application to ensure a predictable user experience.1 These universal elements will be present for all authenticated users.
●	Global Header: A slim header will persist at the top of every screen. It will contain the LabWise logo on the left, providing consistent branding and a link back to the user's default dashboard. On the right, it will feature three key elements:
1.	Global Search Bar: A powerful search input that allows users to quickly find a patient, sample, or order from anywhere in the application. The search will be context-aware, accepting Patient Name, Medical Record Number (MRN), or Sample Accession Number, and presenting results that are clearly differentiated by type.17
2.	Notification Center: An icon-based button that opens a dropdown panel displaying recent system notifications, such as new STAT order alerts or low inventory warnings.
3.	User Profile Menu: A dropdown menu containing the user's name and role, along with links to 'Account Settings' and the 'Logout' function.
This combination of role-specific primary navigation and universal global elements creates an architecture that is both tailored and consistent, providing an optimal balance of focused workflows and system-wide usability.

III. The Pre-Analytical Workflow: The Receptionist's Interface

The pre-analytical phase is the most vulnerable stage for errors that can compromise an entire sample lifecycle.2 The Receptionist's interface is therefore designed as a vigilant gatekeeper, with every feature engineered to maximize accuracy, enforce data completeness, and streamline the patient intake process. The design directly addresses the user stories and pain points of the Receptionist persona, focusing on minimizing manual data entry and providing real-time validation to prevent errors at their source.2

3.1. Dashboard and Appointment Scheduling

Upon logging in, the Receptionist is presented with a dashboard that provides an immediate, actionable overview of the day's activities. The central component of this dashboard is the color-coded calendar view, designed to fulfill US-REC-03.
●	Layout and Functionality: The calendar will display the current day's phlebotomy appointments in a clear, chronological layout. Each appointment block will show the patient's name and the scheduled time. Colors will be used to denote status: blue for 'Scheduled', green for 'Arrived/Checked-in', gray for 'Completed', and a muted red for 'No-show'. This visual system allows the receptionist to manage patient flow at a glance.
●	Managing Walk-ins and Rescheduling: Open time slots are clearly visible, enabling the receptionist to efficiently schedule walk-in patients. Existing appointments can be rescheduled with a simple drag-and-drop interaction, which automatically updates the system and can trigger a notification to the patient. This intuitive interface directly addresses the pain point of managing patient wait times and a mix of scheduled and unscheduled arrivals.2

3.2. Patient Registration and Order Entry

This multi-step workflow is the most critical function for the Receptionist and is designed to be as error-proof as possible. It combines the requirements of US-REC-01, US-REC-02, and US-REC-04 into a single, guided process.
●	Step 1: Patient Identification: The process begins with a prominent search bar to find existing patients by Name, MRN, or Date of Birth. This is a crucial first step to prevent the creation of duplicate patient records, a common and costly error in healthcare systems.2 If the patient is not found, a "Create New Patient" button initiates the registration form.
●	Step 2: Demographics and Insurance Capture (US-REC-01): The patient registration form is designed to minimize manual typing, which is a primary source of errors.2 A key feature is the
"Scan ID / Insurance Card" button. This action simulates the activation of a connected 2D barcode or flatbed scanner. The system will then use Optical Character Recognition (OCR) technology to automatically parse the information from the scanned images and populate the corresponding fields: Patient Name, Address, Date of Birth, and Insurance Policy Information. This single feature dramatically reduces check-in time and improves data accuracy.
●	Step 3: Real-Time Eligibility Check (US-REC-02): Once the insurance policy number is populated (either by scanning or manual entry), a "Verify Eligibility" button becomes active. Clicking this button triggers a real-time, back-end API call to an insurance eligibility service. The system will display the results directly in the UI within seconds, showing the patient's coverage status and their estimated co-payment or deductible. This allows the receptionist to collect payment at the time of service, addressing a significant administrative pain point.2
●	Step 4: Test Order Entry (US-REC-04): The final step is to enter the tests ordered by the physician. A smart search field allows the receptionist to begin typing a test name (e.g., "Complete Blood Count"), and the system will present a list of matching tests from the laboratory's catalog. Upon selecting a test, the interface will require the selection of a corresponding ICD-10 diagnosis code. A searchable, categorized list of codes is provided to ensure a complete and billable order is created, preventing the common problem of incomplete physician requisitions.2 The system includes built-in validation to prevent logical errors, such as ordering a test that is incompatible with the specified sample type.
Upon completion of these steps, the system generates the barcoded labels and requisition forms necessary for the sample collection phase, ensuring a seamless and accurate handoff to the next stage of the laboratory workflow.

IV. The Analytical Engine: The Lab Technician's Digital Workbench

The analytical phase is the core of the laboratory's function, and the Lab Technician's interface is the digital workbench where this work is managed. This environment is defined by high volume, high stress, and an absolute requirement for precision.2 The LabWise design for the technician persona is therefore centered on three principles: proactive prioritization, barcode-driven error prevention, and intelligent automation of repetitive tasks. The goal is to create an interface that acts as a cognitive aid, helping the technician manage their workload effectively and focus their expertise on the results that truly require human review.18

4.1. The Dynamic Worklist (Home Screen)

The technician's home screen is not a static list of tasks but a dynamic, real-time command center that actively guides their workflow, directly fulfilling the requirements of US-TEC-02. It is designed to immediately answer the question, "What is the most important thing I need to do right now?"
●	Prioritized View: The worklist is presented as a data table, automatically sorted by urgency: STAT requests first, followed by overdue samples, and then routine samples in chronological order. This proactive prioritization eliminates the need for the technician to manually scan a long list to find critical samples, a process that is both time-consuming and prone to error under pressure.
●	Visual Flagging System: To enhance scannability, rows are color-coded based on status. STAT samples are given a solid red row background to be unmissable. Overdue samples are highlighted in yellow. This visual system leverages pre-attentive processing, allowing the technician to assess the state of their entire workload in a single glance. This design directly addresses the need to manage a high-volume workload and tight deadlines, helping to mitigate the risk of burnout by reducing cognitive load.2 The specific icons and colors used for these statuses are standardized across the entire application, as defined in the symbology table below.

4.2. Sample-Centric View

To eliminate the risk of sample mix-ups, a core pain point for technicians, all interactions are driven by barcodes.2 As specified in
US-TEC-01, scanning any sample's barcode at any workstation will immediately navigate the user to a dedicated "Sample Details" screen.
This screen serves as the single source of truth for the physical specimen. It prominently displays the patient's name and unique identifiers at the top. The main body of the screen contains a list of all tests ordered for that sample, each with its own real-time status (e.g., 'Pending', 'Awaiting QC', 'Result Ready for Review'). Any special handling notes, such as 'Protect from Light' or 'Frozen Specimen', are displayed in a highly visible alert banner. This barcode-driven, sample-centric approach ensures that the technician always has the correct context for the sample in their hand, making it virtually impossible to perform the wrong test on the wrong sample.
Status / Alert Name	Icon (Line-style)	Color Code (HEX)	Description & UI Behavior
STAT Request	A bold, encircled exclamation mark	#D9534F	Applied to STAT orders. Triggers on-screen pop-ups and audible alerts upon accessioning. Row background is solid red in worklists.
Overdue Sample	A clock icon	#F0AD4E	Applied when a sample's TAT exceeds the defined threshold. Row background is yellow in worklists.
QC Failure	A warning triangle icon	#EC971F	Indicates an associated QC run has failed. Locks all patient results from that run and requires a corrective action log.
Delta Check Flag	A flag icon	#5B3256	Applied to a result that shows a significant, clinically improbable change from the patient's previous result. Requires mandatory review.
Sample Rejected	An 'X' in a circle icon	#777777	Indicates the sample was unsuitable for testing. The record is locked, and the rejection reason is prominently displayed.
Critical Value	A starburst or biohazard icon	#D9534F	Applied to a result that falls within a life-threatening range. Triggers an immediate physician notification workflow.

4.3. Result Entry and Verification

The result verification workflow is designed to augment, not replace, the technician's expertise. It uses automation to handle the routine and intelligent flagging to draw attention to the exceptions, fulfilling the requirements of US-TEC-03 and US-TEC-05.
●	Auto-Verification (US-TEC-05): A significant portion of laboratory results are within normal limits and associated with a clean QC run. The system's auto-verification rules engine will automatically process and release these results without any manual intervention. These results are moved to a separate "Auto-Verified" tab in the interface, effectively removing them from the technician's active workload. This powerful automation frees up the technician's valuable time and attention to focus exclusively on the abnormal and problematic results that require their expert judgment.2
●	Manual Review and Delta Checks (US-TEC-03): Any result that falls outside normal limits, is associated with a pending QC, or fails a delta check is held in the "Requires Review" worklist. When a technician selects a result flagged for a delta check failure, a modal window immediately appears. This modal presents a clear, side-by-side comparison of the current result and the patient's most recent previous result, along with the timestamps for both. This forces the technician to consciously evaluate the discrepancy and investigate a potential pre-analytical error (e.g., IV contamination) or instrument issue before releasing a clinically improbable and potentially dangerous result.2

4.4. Quality Control and Maintenance

Maintaining rigorous quality control and comprehensive instrument documentation is a cornerstone of CLIA compliance.2 The LabWise interface digitizes and streamlines these critical processes as required by
US-TEC-04.
●	Digital QC Logs: Technicians will enter QC results into a simple form. The system will then automatically plot these data points on interactive Levey-Jennings charts. This provides an immediate visual representation of instrument performance over time.
●	Westgard Rules Engine: The system will automatically apply Westgard multirule QC procedures to the data. If a rule is violated (e.g., a 1-3s or 2-2s failure), the chart will visually flag the failing point(s), and the system will place an immediate hold on the release of any patient results from that analytical run. A modal window will then guide the technician to a structured "Corrective Action Log" form, ensuring that all troubleshooting steps are documented in a complete, auditable record required for inspections.2
●	Electronic Instrument Logbooks: The system provides a centralized location for all instrument records. Technicians can log maintenance activities, calibrations, and reagent changes directly into the electronic logbook for each specific instrument, creating an easily searchable and auditable history for compliance and troubleshooting purposes.

V. The Command Center: The Lab Manager's Operational Cockpit

The Lab Manager persona requires a high-level, strategic view of the entire laboratory operation. Their interface is designed as a command center, transforming the vast amounts of transactional data generated by LabWise into clear, actionable, and real-time insights. The design focuses on data visualization, automated alerting, and streamlined administrative tools to support the manager in their core goals of ensuring operational efficiency, quality, and constant regulatory compliance.2

5.1. Real-Time KPI Dashboard

The Lab Manager's default landing page is a configurable Key Performance Indicator (KPI) dashboard, designed to provide an at-a-glance health check of the laboratory's performance, directly fulfilling US-MGR-01. The design emphasizes clarity and scannability, using "big, bold numbers" and simple charts to convey critical information quickly.21
The dashboard will be composed of customizable widgets, including:
●	Average Turnaround Time (TAT): A line graph showing the average TAT for STAT and Routine tests over the past 24 hours, with the ability to filter by specific tests or departments.
●	Sample Rejection Rate: A pie chart breaking down rejected samples by collection site, accompanied by a bar chart showing the most common rejection reasons (e.g., Hemolysis, QNS). This allows the manager to proactively identify training needs at specific clinics.2
●	Instrument Status: A simple status board showing which instruments are online, offline, or have pending QC failures, providing immediate visibility into potential bottlenecks.
●	Current Staff Workload: A bar chart displaying the number of pending samples per technician, helping with real-time resource allocation.
●	Critical Alerts: A summary box highlighting any critical value results that have not yet been acknowledged by the ordering physician.
Each widget is interactive, allowing the manager to click through to a more detailed, in-depth report for further analysis.

5.2. Inventory Management

Preventing stock-outs of critical reagents is a major challenge for lab managers.2 The inventory module automates this process to ensure operational continuity, as specified in
US-MGR-02.
●	Inventory Dashboard: An interface provides a searchable data table of all reagents and consumables, displaying their lot numbers, expiration dates, and current on-hand quantities.
●	Automated Reorder Alerts: For each item, the manager can define a minimum stock level, or "par level." When automated consumption tracking causes the on-hand quantity to fall below this threshold, the system triggers two actions:
1.	A prominent "Low Stock Items" widget appears on the manager's KPI dashboard.
2.	An automated email notification is sent to the manager and any designated purchasing staff.
This proactive alerting system allows the manager to initiate a re-order with sufficient lead time to prevent a costly and disruptive stock-out event.2

5.3. Compliance and Auditing

The Lab Manager is ultimately responsible for ensuring the laboratory is "inspection-ready" at all times.2 The compliance module provides the tools to demonstrate adherence to HIPAA and CLIA regulations on demand.
●	On-Demand Audit Trail (US-MGR-03): A simple but powerful search interface allows the manager to generate a complete, end-to-end audit trail for any patient sample by entering its unique accession number. The system will instantly produce a comprehensive, printable report detailing every user who accessed the sample record, every action they took (e.g., viewed, modified, printed result), and a precise, immutable timestamp for each event. This feature is essential for demonstrating full data integrity and chain of custody during an audit.2
●	Personnel Competency Tracking (US-MGR-05): A centralized module for managing employee records. The manager can upload and track training documents, certifications, and annual competency assessments for each staff member. The system will feature automated reminders for upcoming expirations, ensuring all personnel files are complete and up-to-date for inspections.

5.4. User Administration (Role-Based Access Control)

To comply with HIPAA's "minimum necessary" standard, LabWise must enforce strict controls over who can access and modify data.2 The User Administration module provides the Lab Manager with an intuitive interface to manage these controls, as required by
US-MGR-04.
When creating or editing a user account, the manager will assign a specific role from a predefined list (e.g., 'Receptionist', 'Technician - Chemistry', 'Phlebotomist', 'Manager'). The interface will then clearly display a checklist of the permissions associated with that role—the specific modules they can access and the actions they can perform. This design ensures that the principle of least privilege is enforced system-wide, preventing unauthorized access to sensitive patient information or critical system functions. For example, it makes it impossible for a receptionist to verify lab results or for a technician to modify billing information.2

VI. The External Portals: Interfaces for Physicians and Patients

The external portals are the digital face of the laboratory, serving its primary clients (Referring Physicians) and ultimate stakeholders (Patients). The design for these secure, web-based interfaces must be professional, intuitive, and, above all, trustworthy. They are designed to solve the specific pain points of external users, such as delays in receiving results, confusing report formats, and a lack of access to personal health information.2

6.1. Referring Physician Portal

This portal is designed to be a one-stop shop for physicians, providing them with the tools and information they need to effectively utilize the laboratory's services and make timely clinical decisions, addressing user stories US-PHY-01 through US-PHY-04.
●	Physician Dashboard: Upon logging in, the physician is greeted with a clean dashboard that summarizes their recent activity. It features a list of their pending patient orders with real-time status updates ('Sample in Lab', 'Testing in Progress', 'Final Report Ready'). The most prominent element is an "Action Required: Critical Value Alerts" inbox at the top of the page, ensuring that life-threatening results are never missed.2
●	Online Test Catalog (US-PHY-01): To combat uncertainty in test selection, the portal includes a searchable online catalog. Each entry provides a clear, concise description of the test, its clinical utility, specific specimen requirements (e.g., tube type, volume), collection instructions, and the expected turnaround time. This empowers physicians to order the correct test confidently.
●	Secure Report Access (US-PHY-02): The portal provides immediate access to final PDF reports the moment they are released by the lab. Physicians can view, download, and print reports from their office or mobile device.
●	Clinically Optimized Report Design (US-PHY-04): The design of the patient report itself is optimized for rapid clinical assessment. Abnormal values are clearly highlighted with color-coding. For key quantitative analytes (e.g., creatinine, glucose, PSA), the report will automatically include a graphical trend line that plots the current result alongside the patient's historical results. This visualization provides immediate clinical context, allowing the physician to instantly assess changes over time without having to manually look up previous reports.2

6.2. Patient Portal

The Patient Portal is designed to empower patients by providing direct, understandable access to their own health information, in compliance with HIPAA regulations and fulfilling user stories US-PAT-01 and US-PAT-02.2 The design philosophy acknowledges that patients are not clinicians and prioritizes clarity and context over raw technical data.
●	Secure and Simple Access (US-PAT-01): The portal will feature a straightforward, secure registration and login process. Once authenticated, the patient is presented with a simple list of their available lab reports, sorted by date.
●	Patient-Friendly Report Translation (US-PAT-02): The core of the patient portal is its unique report view. Instead of simply presenting the standard clinical PDF, the interface translates the report into a more understandable format. This design directly addresses the patient pain point of receiving reports filled with "incomprehensible medical jargon".2 For each test result, the interface will display:
1.	The test name (e.g., "Glucose").
2.	A brief, plain-language explanation of what the test measures (e.g., "This test measures the amount of sugar in your blood. It is often used to check for diabetes.").
3.	The patient's numerical result and the normal reference range.
4.	A simple visual indicator, such as a colored bar or a gauge, that clearly shows where the patient's result falls within the low, normal, and high ranges.
This multi-faceted approach transforms the report from a source of confusion and anxiety into an educational tool that helps patients better understand their health and participate more actively in their care. A clear "Download Official Report (PDF)" link is also provided for their records.

VII. Bidirectional Design: Right-to-Left (RTL) Transformation

To serve a global user base, including Arabic-speaking regions, LabWise must be designed for full bidirectional support from the ground up. A Right-to-Left (RTL) layout is not an afterthought but a core requirement that influences the design of every component and screen. This section provides a comprehensive guide for the development team to ensure a high-quality, seamless RTL user experience.

7.1. Layout Mirroring Principles

The fundamental principle of RTL design is the horizontal mirroring of the user interface. All elements that have a directional significance on the horizontal axis must be flipped.
●	Overall Layout: The entire page structure will be mirrored. The vertical navigation sidebar will move from the left to the right side of the screen. The LabWise logo will appear in the top-right of the header, while the user profile menu and notification icon will move to the top-left.
●	Component Placement: Within any given container, the flow of elements will be reversed. For example, a button with an icon to its left in the LTR view will have the icon to its right in the RTL view. Labels for input fields will be right-aligned.

7.2. Component-Specific RTL States

While most components can be mirrored with global CSS rules, some complex components require specific design considerations and dedicated mockups to ensure they function correctly and intuitively in an RTL context.
●	Data Tables: The order of columns will be reversed. The first column of data in an LTR view will become the last column in the RTL view.
●	Charts and Graphs: All horizontal axes will be reversed. For a line graph showing data over time, the time scale will progress from right to left. Bar chart categories will also be plotted from right to left.
●	Calendars: The layout of the calendar grid will be mirrored. The week will begin on the rightmost column (e.g., with Saturday or Sunday, depending on localization) and end on the leftmost column.
●	Progress Bars and Sliders: These elements will fill from right to left as their value increases.

7.3. Typography and Iconography in RTL

Text and icons with directional meaning must also be adapted for RTL.
●	Typography: All text will be right-aligned by default. Any mixed English (LTR) and Arabic (RTL) text within the same string will be handled by the Unicode bidirectional algorithm, which the UI must support correctly.
●	Iconography: Most icons are symmetrical and require no change. However, any icon that implies directionality must be swapped for its mirrored equivalent. This includes icons for arrows (back/forward), indentation, text alignment, and media playback controls.
To ensure a flawless implementation, the following table provides a clear, technical checklist for developers, translating design principles into specific CSS rules and best practices.
LTR CSS Property	RTL CSS Equivalent	Best Practice (Logical Property)	Notes
text-align: left;	text-align: right;	text-align: start;	Use logical properties to handle alignment automatically based on document direction.
float: left;	float: right;	N/A - Avoid floats	Modern layouts should use Flexbox or Grid, which have built-in support for RTL directionality.
padding-left: 10px;	padding-right: 10px;	padding-inline-start: 10px;	Logical properties for padding, margin, and borders prevent manual overrides.
margin: 5px 10px 5px 20px;	margin: 5px 20px 5px 10px;	margin-block: 5px; margin-inline: 20px 10px;	The margin-inline shorthand is less common; using margin-inline-start and margin-inline-end is often clearer.
border-radius: 10px 0 0 10px;	border-radius: 0 10px 10px 0;	N/A	Shorthand properties for radii must be manually flipped. Be cautious with these.
transform: translateX(50px);	transform: translateX(-50px);	transform: translateX(var(--direction, 1) * 50px);	Use a CSS custom property for direction (--direction: -1; in RTL) to flip transforms.

VIII. The Interactive Prototype: A Simulated Journey

The final deliverable, and the ultimate source of truth for the front-end development team, is not a static set of documents but a high-fidelity, clickable prototype. This prototype will be constructed in a tool such as Figma or Adobe XD, linking all the final, approved mockups into a cohesive and interactive simulation of the LabWise application. This allows stakeholders to experience the user flow, provides an unambiguous guide for developers regarding interactions and animations, and enables early-stage usability testing before a single line of code is written.

8.1. Scope of the Prototype

The prototype will be comprehensive, encompassing all screens designed in the preceding sections for both LTR and RTL layouts. It will simulate the entire user journey for all five key personas, demonstrating how the interconnected modules of LabWise work together to manage the complete lifecycle of a patient sample, from the initial order to the final archival of the report.2

8.2. Key User Journeys to be Prototyped

The prototype will focus on demonstrating the successful completion of the core tasks defined in the user stories for each persona. The following key journeys will be fully clickable:
●	The Complete Sample Lifecycle Journey:
○	A Receptionist registers a new patient using the "Scan ID" feature, enters a new order for a "Basic Metabolic Panel," and schedules the phlebotomy appointment.
○	A Lab Technician logs in and sees the new sample at the top of their worklist. They scan the sample's barcode to access its details, simulate loading it onto an analyzer, and then navigate to the result verification screen.
○	The prototype will show one result failing a delta check, forcing the technician to acknowledge the flag and add a comment before verification.
○	The system then automatically transmits the final report.
○	A Referring Physician receives a notification, logs into their portal, and views the final, formatted patient report, including the graphical trend data for the patient's glucose levels.
○	A Patient later logs into their own portal to view the simplified, patient-friendly version of their results.
○	A Lab Manager reviews their KPI dashboard, notes a slight increase in TAT, and then generates a full audit trail for the sample to demonstrate compliance.
●	Exception Handling Journeys:
○	STAT Protocol: A physician places a STAT order, triggering an immediate alert on the technician's worklist.
○	Sample Rejection: A technician at accessioning rejects a hemolyzed sample, logs the reason and notification details in a mandatory form, and the system automatically notifies the ordering physician.
○	QC Failure: A technician enters a QC result that violates a Westgard rule, demonstrating how the system locks patient results and guides the user through the corrective action documentation process.
By simulating these critical workflows, the interactive prototype will provide the development team with a clear, unambiguous, and exhaustive blueprint for building the LabWise application.
Works cited
1.	Best Practices for Rocking UX Design - Lucid Software, accessed September 23, 2025, https://lucid.co/blog/ux-design-best-practices
2.	LabWise: Business Requirements Foundation
3.	User Interface Design for Healthcare Applications: Best Practices and Examples for 2025, accessed September 23, 2025, https://www.eleken.co/blog-posts/user-interface-design-for-healthcare-applications
4.	Everything about the color Teal - Canva, accessed September 23, 2025, https://www.canva.com/colors/color-meanings/teal/
5.	Teal Logos: Meaning and Modern Color Combinations - Mojomox, accessed September 23, 2025, https://mojomox.com/color-teal
6.	The Best 15 Teal Color Palette Combinations - Piktochart, accessed September 23, 2025, https://piktochart.com/tips/teal-color-palette
7.	Shades of Teal Color Palette, accessed September 23, 2025, https://www.color-hex.com/color-palette/4666
8.	Information about typeface PT Sans (8 font styles) - Rentafont, accessed September 23, 2025, https://rentafont.com/fonts/pt-sans
9.	PT Sans - Google Fonts, accessed September 23, 2025, https://fonts.google.com/specimen/PT+Sans
10.	PT Sans - Localfonts, accessed September 23, 2025, https://localfonts.eu/freefonts/traditional-cyrillic-free-fonts/pt-sans/
11.	PT Fonts - Wikipedia, accessed September 23, 2025, https://en.wikipedia.org/wiki/PT_Fonts
12.	Free Line Icons for Designers and Developers - Lineicons, accessed September 23, 2025, https://lineicons.com/
13.	Interface Line Icons royalty-free images - Shutterstock, accessed September 23, 2025, https://www.shutterstock.com/search/interface-line-icons
14.	Line style Icons & Symbols - Flaticon, accessed September 23, 2025, https://www.flaticon.com/free-icons/line-style
15.	Line User Interface Icons royalty-free images - Shutterstock, accessed September 23, 2025, https://www.shutterstock.com/search/line-user-interface-icons
16.	How to Develop a LIMS System for Small Laboratories - Ditstek Innovations, accessed September 23, 2025, https://www.ditstek.com/blog/lims-system-for-small-laboratories
17.	50 Healthcare UX/UI Design Trends With Examples, accessed September 23, 2025, https://www.koruux.com/50-examples-of-healthcare-UI/
18.	7 Best Practices for a Successful LIMS/LIS Implementation | - Clinical Lab Products, accessed September 23, 2025, https://clpmag.com/lab-essentials/information-technology/middleware-software/7-best-practices-for-a-successful-lims-lis-implementation/
19.	Software UI for clinical diagnostic laboratories - Centigrade GmbH, accessed September 23, 2025, https://www.centigrade.de/en/references/software-ui-medical-diagnostic-laboratories
20.	Healthcare dashboards: 8 impactful models + metrics to track - Arcadia, accessed September 23, 2025, https://arcadia.io/resources/healthcare-dashboard-examples
21.	Dashboard Design: best practices and examples - Justinmind, accessed September 23, 2025, https://www.justinmind.com/ui-design/dashboard-design-best-practices-ux
22.	Top 7 Healthcare Dashboard Examples - Bold BI, accessed September 23, 2025, https://www.boldbi.com/resources/dashboard-examples/healthcare/