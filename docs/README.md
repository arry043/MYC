# MYC documentation

| Document                                       | Read it to…                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| [PRD.md](PRD.md)                               | Understand what MYC is and what it must do (product source of truth)      |
| [PHASES.md](PHASES.md)                         | See the roadmap, the current task, and each task's scope                  |
| [ARCHITECTURE.md](ARCHITECTURE.md)             | Understand how the system fits together                                   |
| [RULES.md](RULES.md)                           | Know the rules every change must follow, and the definition of done       |
| [DECISIONS.md](DECISIONS.md)                   | Learn why things are the way they are, and which questions are still open |
| [../supabase/README.md](../supabase/README.md) | Write migrations, RLS policies and database tests                         |
| [../README.md](../README.md)                   | Set up, run and deploy the apps                                           |

## Keeping docs current

Docs are part of the definition of done ([RULES.md §9](RULES.md#9-definition-of-done)):

- Finishing a task → update its status and summary in **PHASES.md**.
- Changing structure, data flow, environments or security → update **ARCHITECTURE.md**.
- Making a non-obvious choice or answering an open question → add an entry to **DECISIONS.md**.
- Changing setup, scripts or environment variables → update the root **README.md**.
- Changing database conventions → update **supabase/README.md**.
- The **PRD** changes only when product requirements change.
