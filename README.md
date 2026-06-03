# Issue Triage Action 🏷️

[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)](https://github.com/features/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 新規Issueに自動でラベル付け・優先度分類・担当者アサインを行うGitHub Action

## ✨ 特徴

- 🏷️ **自動ラベリング** — Issue本文のキーワード解析により `bug`, `feature`, `question`, `documentation` 等のラベルを自動付与
- 🔢 **優先度判定** — 内容の重要度から P0〜P3 の優先度ラベルを自動設定
- 👤 **担当者アサイン** — ラベルに基づいて適切なメンテナーを自動アサイン
- ⚙️ **高いカスタマイズ性** — `.github/issue-triage.yml` で全設定をカスタマイズ可能

## 🚀 クイックスタート

### 1. ワークフローファイルの作成

`.github/workflows/issue-triage.yml` を作成:

```yaml
name: Issue Triage
on:
  issues:
    types: [opened]

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - uses: hihutuka/issue-triage-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          config-path: '.github/issue-triage.yml'
```

### 2. 設定ファイルの作成

`.github/issue-triage.yml` を作成:

```yaml
labels:
  bug:
    keywords: ['bug', 'error', 'crash', 'fail', 'broken', 'not working']
    color: 'd73a4a'
  feature:
    keywords: ['feature', 'enhancement', 'request', 'add', 'support']
    color: 'a2eeef'
  question:
    keywords: ['question', 'how to', 'help', 'ask']
    color: 'd876e3'
  documentation:
    keywords: ['docs', 'documentation', 'readme', 'guide']
    color: '0075ca'

priority:
  P0:
    keywords: ['critical', 'urgent', 'security', 'vulnerability', 'production down']
  P1:
    keywords: ['important', 'high priority', 'major', 'regression']
  P2:
    keywords: ['medium', 'moderate']
  P3:
    keywords: ['low', 'minor', 'nice to have']

assignees:
  bug: ['maintainer1']
  feature: ['maintainer2']
  documentation: ['maintainer3']
```

## ⚙️ 入力パラメータ

| パラメータ | 必須 | デフォルト | 説明 |
|-----------|------|-----------|------|
| `github-token` | ✅ | — | GitHub Token（`${{ secrets.GITHUB_TOKEN }}`） |
| `config-path` | ❌ | `.github/issue-triage.yml` | 設定ファイルのパス |
| `default-label` | ❌ | `triage` | キーワードが一致しない場合のデフォルトラベル |
| `enable-priority` | ❌ | `true` | 優先度の自動判定を有効にする |
| `enable-assign` | ❌ | `true` | 担当者の自動アサインを有効にする |

## 📖 設定リファレンス

### ラベル設定

```yaml
labels:
  <ラベル名>:
    keywords: ['キーワード1', 'キーワード2']  # マッチするキーワード一覧
    color: 'hex_color'                         # ラベルの色（16進数）
```

### 優先度設定

```yaml
priority:
  <優先度>:
    keywords: ['キーワード1', 'キーワード2']
```

### 担当者設定

```yaml
assignees:
  <ラベル名>: ['username1', 'username2']
```

## 🤝 コントリビューション

コントリビューションを歓迎します！[CONTRIBUTING.md](CONTRIBUTING.md) をご覧ください。

## 📄 ライセンス

[MIT License](LICENSE) の下で公開されています。
