# 📋 Auto PR Reviewer Assignment Action

> GitHub Action that automates PR review process with random 3-person selection.

[![GitHub Super-Linter](https://github.com/Allra-Fintech/allra-reviewer-assignment/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/Allra-Fintech/allra-reviewer-assignment/actions/workflows/ci.yml/badge.svg)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

**Language**: [한국어](./README.md) | **English**

## 🚀 Key Features

- **Automatic Reviewer Assignment**: Randomly selects 3 reviewers when PR is
  created or reopened
- **PR Author Exclusion**: Automatically excludes PR author from reviewer
  candidates
- **Slack Notification Support**: Optional rich message notifications via Slack
  webhook
- **Flexible Configuration**: Manage reviewers through YAML configuration file

## 📦 Installation & Usage

### 1. Create Reviewers Configuration File

Create `.github/reviewers.yml` file in your project root and define your
reviewer list:

```yaml
# random reviewer pool (optional)
reviewers:
  - githubName: 'john-doe'
    slackMention: '<@U1234567>' # Slack user ID
  - githubName: 'jane-smith'
    slackMention: '<@U2345678>' # Slack user ID

# fixed reviewer pool (optional)
fixedReviewers:
  - githubName: 'you-die'
    slackMention: '<@U0000000>' # Slack user ID

# author Slack mention mapping (optional) — not used for reviewer assignment
members:
  - githubName: 'pr-author'
    slackMention: '<@U9999999>' # Slack user ID
```

The Slack notification mentions the PR author by looking up `slackMention` in
`members` → `fixedReviewers` → `reviewers`, and falls back to the GitHub login
when none is found.

### 2. Create Workflow File

Create `.github/workflows/reviewer-assignment.yml`:

```yaml
name: 🎯 Auto PR Reviewer Assignment

on:
  pull_request:
    types: [opened, reopened]

jobs:
  assign-reviewers:
    name: Assign Reviewers
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Assign random reviewers
        uses: allra/allra-reviewer-assignment@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          slack-webhook-url: ${{ secrets.PR_REVIEW_SLACK_WEBHOOK }} # Optional
          reviewers-config-path: '.github/reviewers.yml' # Default
          max-reviewers: '3' # Default
```

## ⚙️ Input Parameters

| Parameter               | Required   | Default                 |
| ----------------------- | ---------- | ----------------------- |
| `github-token`          | ✅ **Yes** | -                       |
| `slack-webhook-url`     | ❌ No      | -                       |
| `reviewers-config-path` | ❌ No      | `.github/reviewers.yml` |
| `max-reviewers`         | ❌ No      | `3`                     |

## 📤 Outputs

| Output Name          | Description                                |
| -------------------- | ------------------------------------------ |
| `assigned-reviewers` | List of assigned reviewer GitHub usernames |

## 💬 Slack Notifications

When Slack webhook URL is configured, sends notifications in this format:

```text
<@U1234567> <@U2345678> <@U3456789>
You have been assigned as reviewers!!

• PR Title: <https://github.com/owner/repo/pull/123|Fix login bug>
• Author: allra
• Repository: <https://github.com/owner/repo|repo>
```

### Slack Webhook Setup Guide

1. Enable Incoming Webhooks feature in your Slack app
2. Register webhook URL as `PR_REVIEW_SLACK_WEBHOOK` in GitHub Secrets
3. Add `slackMention` field with Slack user ID in reviewer configuration

## 🔧 How It Works

1. **Trigger**: Action runs when PR is created or reopened
2. **Load Configuration**: Reads reviewer configuration from specified file path
3. **Filter Candidates**: Excludes PR author from reviewer candidates
4. **Random Selection**: Uses Fisher-Yates shuffle algorithm for fair random
   selection
5. **GitHub Assignment**: Assigns selected reviewers to PR via GitHub API
6. **Slack Notification**: (Optional) Sends assignment notification to Slack

## 📁 Project Structure

```text
src/
├── main.ts              # Main orchestration logic
├── messageTemplates.ts  # message template management
├── reviewer-selector.ts # Reviewer selection and configuration loading
├── slack-notifier.ts    # Slack webhook notification features
├── github-client.ts     # GitHub API integration
└── types.ts            # Common type definitions

__tests__/              # Comprehensive unit tests
├── main.test.ts
├── reviewer-selector.test.ts
├── slack-notifier.test.ts
└── github-client.test.ts
```

## 🛠️ Development Guide

### Install Dependencies

```bash
npm install
```

### Development & Build

```bash
# Code formatting
npm run format:write

# Linting
npm run lint

# Run tests
npm test

# Production build
npm run bundle
```

### Local Testing

```bash
# Create .env file with environment variables
echo "INPUT_GITHUB-TOKEN=your-token" > .env
echo "INPUT_REVIEWERS-CONFIG-PATH=.github/reviewers.yml" >> .env
echo "INPUT_MAX-REVIEWERS=3" >> .env

# Run local action (if compatible)
npm run local-action
```

## 🚨 Important Notes

- **Token Permissions**: `GITHUB_TOKEN` requires PR reviewer assignment
  permissions
- **Configuration File**: Action fails if reviewer configuration file is missing
- **Minimum Reviewers**: If fewer candidates available than requested, selects
  all available
- **PR Author**: PR author is always excluded from reviewer candidates

## 📈 Advanced Usage

### Conditional Execution

To assign reviewers only under specific conditions:

```yaml
jobs:
  assign-reviewers:
    runs-on: ubuntu-latest
    # Don't run on draft PRs
    if: github.event.pull_request.draft == false
    steps:
      # ... action steps
```

### Integration with Other Actions

```yaml
steps:
  - name: Assign reviewers
    id: assign
    uses: allra/allra-reviewer-assignment@v1
    with:
      github-token: ${{ secrets.GITHUB_TOKEN }}

  - name: Output assigned reviewers
    run: echo "Assigned reviewers: ${{ steps.assign.outputs.assigned-reviewers }}"
```

## 🧪 Test Coverage

```text
File                  | % Stmts | % Branch | % Funcs | % Lines |
----------------------|---------|----------|---------|---------|
All files             |   97.77 |     93.1 |     100 |    97.7 |
 main.ts              |     100 |      100 |     100 |     100 |
 reviewer-selector.ts |     100 |    83.33 |     100 |     100 |
 slack-notifier.ts    |     100 |      100 |     100 |     100 |
 github-client.ts     |   83.33 |       50 |     100 |   81.81 |
```

## 🤝 Contributing

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## 📄 License

This project is distributed under the [MIT License](LICENSE).

## 🔗 Related Links

- [GitHub Actions Official Documentation](https://docs.github.com/en/actions)
- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [YAML Syntax Guide](https://yaml.org/spec/1.2/spec.html)

---

## Made with ❤️ by Allra-Fintech
