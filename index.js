#!/usr/bin/env node

const core = require("@actions/core");
const { context, getOctokit } = require("@actions/github");

async function run() {
  try {
    const githubToken = core.getInput('github_token', { required: true });

    const fullRepoName = core.getInput('repository') === '' ? context.repository.full_name : core.getInput('repository');
    const [owner, repo] = fullRepoName.split('/');

    const issueNumber =
      core.getInput('issue_number') === ''
        ? context.issue.number
        : parseInt(core.getInput('issue_number'));

    if (!issueNumber) {
      core.setFailed("Cannot infer the target issue parameter!");
      return;
    }

    const state = core.getInput('state', { required: true });
    const targetName = core.getInput('name', { required: true });
    const title = core.getInput('title')
    const summary = core.getInput('summary');
    const targetURL = core.getInput('target_url');

    if (!['action_required', 'cancelled', 'failure', 'neutral', 'success', 'skipped', 'timed_out'].includes(state)) {
        throw new Error(`The state ${state} is not supported. Expected one of: action_required, cancelled, failure, neutral, success, skipped, timed_out`);
    }
    
    const client = getOctokit(githubToken);

    const {data} = await client.rest.pulls.get({repo, owner, issueNumber});
    core.info(`Fetch pull request ${issueNumber} for ${owner}/${repo}.`);
    const ref = data[0].head.ref;
    const commitSha = data[0].head.sha;

    if (!commitSha || !ref) {
      throw new Error(`failed to get basic pull_request data. commit_sha: ${commitSha}, ref: ${ref}`);
    }
    core.info(`PR HEAD ${commitSha} @ ${ref}`);


    const allChecks = (
        await client.rest.checks.listForRef({
            owner: owner,
            repo: repo,
            ref: commitSha,
        })
    ).data.check_runs;

    let targetCheck = null;
    allChecks.forEach((checkRun) => {
        let name = checkRun.name;
        if (name === targetName) {
            targetCheck = checkRun;
        }
    });

    const completedAt = new Date().toISOString();
    if (targetCheck === null) {
        core.info(`Check run ${targetCheck.name} not found. Creating it...`);
        await client.rest.checks.create({
            completed_at: completedAt,
            conclusion: state,
            details_url: targetURL,
            head_sha: commitSha,
            name: targetName,
            output: {
                summary: summary,
                title: title,
            },
            owner: owner,
            repo: repo,
            started_at: completedAt,
            status: "completed",
        });
    } else {
        core.info(`Found check run ${targetCheck.name}. Modifiying it...`);
        await client.rest.checks.update({
          check_run_id: targetCheck.id,
          completed_at: completedAt,
          conclusion: state,
          details_url: targetURL,
          head_sha: commitSha,
          name: targetName,
          output: {
              summary: summary,
              title: title,
          },
          owner: owner,
          repo: repo,
          started_at: completedAt,
          status: "completed",
      });
    }
  } catch (e) {
    core.error(e);
    core.setFailed(e.message);
  }
}

run();