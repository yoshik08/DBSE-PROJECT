# Stack mapping — syllabus vs SportSphere

The course material lists a Java/Spring/MySQL stack. SportSphere implements
every layer with the Node/Express/MongoDB equivalents taught in the course
Telegram group (Dr. Prasanthi's own project guides).

| Syllabus item        | Our alternative      | Why it matches                                  |
|----------------------|----------------------|-------------------------------------------------|
| Java                 | JavaScript (Node.js) | backend programming language                    |
| Spring Boot          | Express              | backend framework, handles routing + middleware |
| MySQL                | MongoDB Atlas        | the database (free M0 tier)                     |
| JDBC                 | MongoDB Node driver  | raw database connectivity, sits under Mongoose  |
| Hibernate / Spring Data JPA | Mongoose      | ODM/ORM: models map to database records         |
| Spring Web (REST API)| Express REST routes  | GET/POST/PUT/DELETE api endpoints               |
| Postman              | Postman              | same tool, api testing                          |

One-line defense for the review:
"Every layer of the syllabus stack has a direct counterpart in ours —
Mongoose is our Hibernate, Express is our Spring Web, MongoDB Atlas is our
MySQL. Same architecture, JavaScript instead of Java, which matches the
Node/Express project guides taught in this course."
