const core = require('@actions/core');
const github = require('@actions/github');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

/**
 * Issue本文からキーワードを検索し、マッチするラベルを返す
 * @param {string} text - Issue本文
 * @param {Object} labelConfig - ラベル設定
 * @returns {string[]} マッチしたラベル名の配列
 */
function matchLabels(text, labelConfig) {
  const lowerText = text.toLowerCase();
  const matched = [];

  for (const [labelName, config] of Object.entries(labelConfig)) {
    const keywords = config.keywords || [];
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matched.push(labelName);
        break;
      }
    }
  }

  return matched;
}

/**
 * Issue本文から優先度を判定する
 * @param {string} text - Issue本文
 * @param {Object} priorityConfig - 優先度設定
 * @returns {string|null} 優先度ラベル（P0〜P3）またはnull
 */
function matchPriority(text, priorityConfig) {
  const lowerText = text.toLowerCase();

  // 優先度が高い順にチェック（P0 → P3）
  const priorities = ['P0', 'P1', 'P2', 'P3'];

  for (const priority of priorities) {
    const config = priorityConfig[priority];
    if (!config || !config.keywords) continue;

    for (const keyword of config.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return priority;
      }
    }
  }

  return null;
}

/**
 * ラベルに基づいて担当者を取得する
 * @param {string[]} labels - マッチしたラベル名の配列
 * @param {Object} assigneeConfig - 担当者設定
 * @returns {string[]} アサインするユーザー名の配列
 */
function getAssignees(labels, assigneeConfig) {
  const assignees = new Set();

  for (const label of labels) {
    const users = assigneeConfig[label];
    if (Array.isArray(users)) {
      users.forEach(user => assignees.add(user));
    }
  }

  return Array.from(assignees);
}

/**
 * ラベルが存在しない場合は作成する
 * @param {Object} octokit - GitHub API client
 * @param {Object} context - GitHub context
 * @param {string} labelName - ラベル名
 * @param {string} color - ラベルの色（hex）
 */
async function ensureLabelExists(octokit, context, labelName, color) {
  try {
    await octokit.rest.issues.getLabel({
      owner: context.repo.owner,
      repo: context.repo.repo,
      name: labelName,
    });
  } catch (error) {
    if (error.status === 404) {
      await octokit.rest.issues.createLabel({
        owner: context.repo.owner,
        repo: context.repo.repo,
        name: labelName,
        color: color || 'ededed',
      });
      core.info(`Created label: ${labelName}`);
    }
  }
}

/**
 * 設定ファイルを読み込む
 * @param {string} configPath - 設定ファイルのパス
 * @returns {Object} 設定オブジェクト
 */
function loadConfig(configPath) {
  const defaultConfig = {
    labels: {
      bug: {
        keywords: ['bug', 'error', 'crash', 'fail', 'broken', 'not working'],
        color: 'd73a4a',
      },
      feature: {
        keywords: ['feature', 'enhancement', 'request', 'add', 'support'],
        color: 'a2eeef',
      },
      question: {
        keywords: ['question', 'how to', 'help', 'ask'],
        color: 'd876e3',
      },
      documentation: {
        keywords: ['docs', 'documentation', 'readme', 'guide'],
        color: '0075ca',
      },
    },
    priority: {
      P0: { keywords: ['critical', 'urgent', 'security', 'vulnerability', 'production down'] },
      P1: { keywords: ['important', 'high priority', 'major', 'regression'] },
      P2: { keywords: ['medium', 'moderate'] },
      P3: { keywords: ['low', 'minor', 'nice to have'] },
    },
    assignees: {},
  };

  try {
    if (fs.existsSync(configPath)) {
      const fileContent = fs.readFileSync(configPath, 'utf8');
      const userConfig = yaml.load(fileContent);
      return { ...defaultConfig, ...userConfig };
    }
  } catch (error) {
    core.warning(`Failed to load config from ${configPath}: ${error.message}`);
  }

  return defaultConfig;
}

/**
 * メイン処理
 */
async function run() {
  try {
    const token = core.getInput('github-token', { required: true });
    const configPath = core.getInput('config-path') || '.github/issue-triage.yml';
    const defaultLabel = core.getInput('default-label') || 'triage';
    const enablePriority = core.getInput('enable-priority') !== 'false';
    const enableAssign = core.getInput('enable-assign') !== 'false';

    const octokit = github.getOctokit(token);
    const context = github.context;

    // Issueイベント以外は無視
    if (context.eventName !== 'issues') {
      core.info('This action only runs on issue events. Skipping.');
      return;
    }

    const issue = context.payload.issue;
    if (!issue) {
      core.warning('No issue found in the event payload.');
      return;
    }

    const issueText = `${issue.title} ${issue.body || ''}`;
    core.info(`Triaging issue #${issue.number}: ${issue.title}`);

    // 設定ファイルの読み込み
    const config = loadConfig(configPath);

    // ラベルマッチング
    const matchedLabels = matchLabels(issueText, config.labels || {});
    core.info(`Matched labels: ${matchedLabels.join(', ') || 'none'}`);

    // マッチしない場合はデフォルトラベルを付与
    const labelsToApply = matchedLabels.length > 0 ? matchedLabels : [defaultLabel];

    // 優先度判定
    if (enablePriority && config.priority) {
      const priority = matchPriority(issueText, config.priority);
      if (priority) {
        labelsToApply.push(priority);
        core.info(`Matched priority: ${priority}`);
      }
    }

    // ラベルの存在確認と作成
    for (const label of labelsToApply) {
      const labelConfig = config.labels?.[label];
      await ensureLabelExists(octokit, context, label, labelConfig?.color);
    }

    // ラベルの適用
    await octokit.rest.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      labels: labelsToApply,
    });
    core.info(`Applied labels: ${labelsToApply.join(', ')}`);

    // 担当者のアサイン
    if (enableAssign && config.assignees) {
      const assignees = getAssignees(matchedLabels, config.assignees);
      if (assignees.length > 0) {
        await octokit.rest.issues.addAssignees({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: issue.number,
          assignees: assignees,
        });
        core.info(`Assigned to: ${assignees.join(', ')}`);
      }
    }

    core.setOutput('labels', labelsToApply.join(','));
    core.setOutput('priority', labelsToApply.find(l => l.startsWith('P')) || '');
    core.info('Issue triage completed successfully!');
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

// エクスポート（テスト用）
module.exports = { matchLabels, matchPriority, getAssignees, loadConfig, run };

// メイン実行
if (require.main === module) {
  run();
}
