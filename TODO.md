- [ ] consolidate launch/tui script so there's just one entrypoint
  - [ ] create script for adding execution of the launch script to path (covering different os's) for easy cli invocation

- [ ] in setup 'skill' ask questions about the expected work-way of the user so that the setup can be made to meet them;
    - [ ] should worktrees/branches be created (per task?)
    - [ ] do you want to work with 'tasks'? From what source (e.g. jira/notion/gitlab issues)? How do you want to provide those tasks e.g. do you want to provide a link that can be fetched or do you want to copy-paste the full context yourself)
    - [ ] which flows should be created
      - [ ] e.g. a flow to work on a task
      - [ ] e.g. a flow to qa a task
      - [ ] e.g. a flow to investigate a task

- [ ] create providers for many git providers
- [ ] create providers for many ticket providers
- [ ] create many presets for different setup/steps/prompts


- [ ] for every flow, and per usage allow;
   - [ ] different git provider
   - [ ] different agent
   - [ ] support supplying useful argument per agents, perhaps build into config + arbitrary for easy compatibility

- [ ] ⁠create own layout wrapper instead of tmux