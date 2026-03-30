# **Sprint 3 Summary**
In Sprint 3, the team selected three key user stories: viewing doctor availability in a calendar format, the appointment booking system, and the secure personal portal. These were prioritized because they completed the core patient journey outlined in the project brief. The doctor's availability calendar allows patients to clearly see when doctors are available, while the appointment booking system enables them to take action and schedule visits. The secure personal portal brings these features together in a protected environment where patients can manage their information and interact with the system safely.

These features were chosen based on their high user value, as they directly support patient independence and self-service. By completing these stories, the system moves closer to a fully functional healthcare platform where patients can log in, view availability, and book appointments without external assistance. This aligns strongly with the patient-centric focus of the brief, ensuring that the most important user needs are addressed by the end of the sprint.

The team also used experience from Sprints 1 and 2 to better estimate and plan this sprint. Previous challenges, particularly with authentication and deployment, helped improve our understanding of task complexity. As a result, story point estimates in Sprint 3 were more accurate, and the team selected a realistic workload that could be fully completed within the sprint. This demonstrates improved sprint planning, better time management, and increased team efficiency.

GitHub Version Control Link:
https://github.com/atanasovilia/Group_Project_SoftwareEngineering_University/commits/Sprint-3-Complete

Group Video Youtube Link:
https://youtu.be/JxaNyyvjHmQ

### **Authentication Testing**
| Test ID | Test Scenario | Test Steps | Expected Result | Actual Result | Status |
|------|------------|----------------|-------------|--------|--------|
| AUTH-01 | Register new account | Register with new email | Account created successfully | Account is created and ID is issued | Pass |
| AUTH-02 | Duplicate registration | Register same email again | Error: account already exists |
| AUTH-03 | Valid login | Login with correct credentials | Login successful, redirect to home |
| AUTH-04 | Invalid password | Login with wrong password | Error message displayed |
| AUTH-05 | Non-existent account | Login with unknown email | Error message displayed | 
<br><br>
### **Medical Records**
| Test ID | Test Scenario | Test Steps | Expected Result | Actual Result | Status |
|------|------------|----------------|-------------|--------|--------|
| MR-01 | Create record | Enter Dataset A and save | Record created successfully |  |  |
| MR-02 | Update record | Repace with Dataset B and save | Record uodated (no dublicate) |
| MR-03 | Persist data | Refresh page | Latest data is displayed | 
<br><br>
### **Validation Testing**
| Test ID | Test Scenario | Test Steps | Expected Result | Actual Result | Status |
|------|------------|----------------|-------------|--------|--------|
| VAL-01 | Future DOB | Enter 2030-01-01 | Validation error shown |  |  |
| VAL-02 | Invalid Phone | Enter letters in phone | Validation error shown |
| VAL-03 | Invalid Name | Enter @@@@ | Validation error shown |
| VAL-04 | Invalid blood type | Enter Z+ | Validation error shown |
<br><br>
### **Booking System**
| Test ID | Test Scenario | Test Steps | Expected Result | Actual Result | Status |
|------|------------|----------------|-------------|--------|--------|
| BK-01 | Book valid slot | Book earliest available slot | Booking successful |  |  |
| BK-02 | Book different doctor | Select another doctor slot | Booking successful |
| BK-03 | Book past date | Sekect past date | Booking rejected |
| BK-04 | Book taken slot | Try already booked slot | Booking rejected |
| BK-05 | Slot removal | Book slot then recheck availability | Slot no longer visible |
<br><br>
### **Appointments Page**
| Test ID | Test Scenario | Test Steps | Expected Result | Actual Result | Status |
|------|------------|----------------|-------------|--------|--------|
| APPT-01 | View Appointment | Go to appointments page | Appointment appears under All/Confirmed |  |  |
| APPT-02 | Cancel Appointment | Cancel a booking | Moves to canelled |
| APPT-03 | Persist cancellation | Refresh page | Status remains cancelled |
<br><br>
### **Navigation & Session**
| Test ID | Test Scenario | Test Steps | Expected Result | Actual Result | Status |
|------|------------|----------------|-------------|--------|--------|
| NAV-01 | login redirect | login to system | redirect to home page |  |  |
| NAV-02 | get started button | click get started | opens personal records |
| NAV-03 | side menu | open/close menu | menu works on all pages |
| NAV-04 | logout | click logout | redirect to login page |
| NAV-05 | session protection | access page after logout | access denied / redirected |
<br><br>
### **End-to-End Flow**
| Test ID | Test Scenario | Test Steps | Expected Result | Actual Result | Status |
|------|------------|----------------|-------------|--------|--------|
| E2E-01 | full user journey | register/record/update/book/cancel/logout/login | entire flow works correctly |  |  |
<br><br>
### **Sprint 3 Retrospective**
Across Sprint 3 and the overall project, the team demonstrated clear improvement in both technical implementation and project management. A major success was the completion of all core system features, including authentication, the medical records portal, doctor availability, and the appointment booking system. Each of these features met their acceptance criteria and was successfully integrated, resulting in a fully functional and patient-centered system. Compared to Sprint 1, where the team was still understanding the requirements and tools, Sprint 3 showed much stronger planning, with more accurate estimations and a clearer understanding of task complexity.

Team collaboration was a key strength throughout the project. All members were consistently punctual, actively contributed during meetings, and supported each other when challenges arose. By Sprint 3, the team developed an efficient workflow, particularly when integrating frontend and backend components. For example, collaboration during authentication and booking system development helped reduce bugs and ensure smoother integration. This reflects strong communication and teamwork, which are essential aspects of Agile development.

From a Scrum perspective, sprint planning, backlog refinement, and regular check-ins were highly effective in keeping the project on track. The team improved their use of GitHub over time, with consistent commitments from multiple members and better use of branches to manage features. Testing and validation also improved in Sprint 3, with features being checked more thoroughly against acceptance criteria before being marked as complete. Additionally, earlier challenges such as deployment and integration were managed more effectively in later sprints, showing improved risk management and problem-solving. Overall, the team demonstrated clear growth across all sprints, both in applying Scrum practices and delivering a high-quality system.

### **What could be improved?**
Across the project, one key area the team would improve is estimation accuracy and sprint planning. In the earlier sprints, some tasks—particularly authentication and deployment—were underestimated due to their technical complexity. Although this improved Sprint 3, a more effective approach would have been to break down large user stories into smaller, more manageable tasks from the beginning. In future projects, the team would apply more detailed backlog refinement and planning poker techniques to produce more realistic story point estimates and avoid time pressure.

Another area for improvement is testing coverage. While features were tested against acceptance criteria, formal unit testing and automated testing were limited. To align more closely with Agile best practices, the team would introduce testing earlier in the development process, following a more test-driven or continuous integration approach. For example, implementing unit tests alongside feature development and using tools to automate testing would improve reliability and ensure that bugs are identified earlier rather than during integration.

Additionally, although team collaboration was strong, documentation could have been maintained more consistently throughout the project rather than being updated towards the end of each sprint. In the future, the team will ensure that documentation (such as backlog updates, design decisions, and progress tracking) is continuously maintained alongside development. This would improve transparency and better reflect Agile principles such as iterative progress and continuous feedback.

Finally, workload distribution could be further refined. While all members contributed, some tasks—particularly backend and deployment work—required more time and effort than initially expected. In future sprints, the team would aim for a more balanced allocation of tasks and encourage greater cross-functional involvement, ensuring that all members gain experience across both frontend and backend development. This would improve flexibility, reduce bottlenecks, and strengthen overall team capability.