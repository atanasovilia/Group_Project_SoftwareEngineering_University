# Sprint 1 - Group Project Software Engineering

|  |  |
| ----------- | ----------- |
| Module | MCOMD2SWE - Software Engineering |
| Team Members | 1. Anurag Anurag 2. Ilia Atanasov 3. Denis Citu 4. Theodor Rares Ifrosa |
| Scrum Master | Theodor Rares Ifrosa |
| Submission Date | 30th March 2026 |
| Module Team | Nazish Riaz & Scott Turner |

<br><br>
| Full Name | Role / Responsibility |
| Theo Ifrosa | Scrum Master & Backend |
| Anurag Anurag | Frontend |
| Denis Citu | Frontend |
| Ilia Atanasov | Backend |
<br><br>
### **User Conversation**
This system is designed to be patient focused, meaning that the primary focus of all features is to improve the patient’s experience and accessibility. During our initial Sprint 1 planning discussion, we reviewed the project briefly and found three core system requirements: appointment booking, access to medical records, and real-time doctor availability. Rather than immediately listing features, we approached the task by putting ourselves in the position of a patient and asking what problems they typically face when interacting with healthcare systems. This helped us create meaningful user stories based on real-world needs like reducing waiting times, simplifying access to personal health information, and enabling quick appointment scheduling.

As a group, we discussed each user journey in detail. As example, when considering appointment booking, we asked questions like: “How quickly should a patient be able to book?” and “What information do they need before confirming?” Further, for medical records, we focused on accessibility and privacy, ensuring that patients can securely view their history more easily. For real-time availability, we focused on transparency, allowing patients to make informed decisions based on available doctor schedules. These discussions ensured that our user stories were not just functional but focused on user expectations and usability standards.

We also made a few assumptions to keep the system manageable within our scope. For example, we assumed a single patient role without implementing a full admin or staff management portal. This decision allowed us to concentrate on delivering a high-quality patient experience rather than dividing our focus across multiple user types. Furthermore, we assumed that all patients would have secure login credentials to access their data. These assumptions were justified as they aligned with the brief requirements and allowed us to prioritize the most critical features effectively.

Example of our group discussion:<br>
Theo - “Since the system is patient centered; everything should focus on what the patient can do without needing staff help.” 

Ilia - “Yeah, so booking appointments should be really straightforward, maybe just a few clicks, and they can see available slots instantly.” 

Anurag - “I agree, and for medical records, patients should be able to log in and view their history anytime, not just when they visit the hospital.” 

Denis - “What about doctor availability? It should update in real time; otherwise, patients might book slots that aren’t free.” 

Anurag - “Good point, so one of our main user stories should be about viewing live availability before booking.” 

Ilia - “So basically, our three main areas are booking, records, and availability all designed from the patient’s perspective.” 

Theo - “Exactly, and since we’re not building an admin system, we can focus on making these features really clean and user-friendly.” 

This collaborative discussion helped us understand user needs and ensured that our final user stories directly reflect the priorities outlined in the project brief.<br><br>
### **Acceptance Criteria**

**Authentication (Patient Login/Register):**<br>
- Users can register only with a unique email address; duplicate emails show an error message 

- Password field must not be empty and must meet minimum length requirements (e.g. 8 characters) 

- Passwords are stored securely (hashed), not in plain text 

- Login fails with a clear error message if email or password is incorrect 

**Appointment Booking:**

- User can only book appointments for future dates (past dates are disabled) 

- System displays available time slots based on real-time doctor availability 

- Booking is confirmed only after all required fields are completed 

- Double booking of the same time slot is prevented 

**Medical Records Portal:**

- Patients can only view their own medical records after logging in 

- Other users can’t access another patient data, and no one can access Records without being logged in 

- Records are displayed clearly with relevant details (date, doctor) 

- System requires authentication before accessing any medical data 

**Real-Time Availability:**

- Doctor availability updates dynamically without needing a page refresh 

- Unavailable time slots are clearly disabled or hidden 

- Availability shown matches the backend data at the time of booking 

### **Sprint 1 Summary**
In Sprint 1, the team focused on establishing the core foundations of the system, particularly around authentication and basic appointment functionality. We prioritized user stories from 1st to 3rd, which is authentication and 4th which is appointment booking because a secure login system is important so patients can access any other features like medical records or booking appointments. These features add value to the patient by enabling secure access and the ability to begin interacting with the system on their own. 

All other user stories rely on authentication being in place first. During sprint planning, we agreed on the sprint backlog together, selecting tasks that were achievable within the timeframe while still delivering important functionality. One team member was assigned the role of Scrum Master to coordinate progress and ensure effective communication. As a team, we decided to deliver a working authentication system and a basic appointment booking feature by the end of the sprint.