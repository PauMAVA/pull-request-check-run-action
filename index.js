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

    const conclusion = core.getInput('conclusion');
    const status = core.getInput('status');
    const targetName = core.getInput('name', { required: true });
    const title = core.getInput('title')
    const summary = core.getInput('summary');
    const targetURL = core.getInput('target_url');

    // TODO Check parameter validity
    if (status === 'completed' && conclusion === '') {
        throw new Error('When the status is completed the conclusion parameter is mandatory. When status is not provided it defaults to completed.');
    }

    if (status !== '' && !['queued', 'in_progress', 'completed'].includes(status)) {
        throw new Error(`The status ${status} is not supported. Expected one of: queued, in_progress, completed`);
    }

    if (conclusion !== '' && !['action_required', 'cancelled', 'failure', 'neutral', 'success', 'skipped', 'timed_out'].includes(conclusion)) {
        throw new Error(`The conclusion ${conclusion} is not supported. Expected one of: action_required, cancelled, failure, neutral, success, skipped, timed_out`);
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

    const dateRef = new Date().toISOString();

    let parameters = {
      details_url: targetURL,
      head_sha: commitSha,
      name: targetName,
      output: {
        summary: summary,
        title: title,
      },
      owner: owner,
      repo: repo,
      started_at: dateRef,
      status: status,
    };

    if (status === 'completed') {
      parameters['conclusion'] = conclusion;
      parameters['completed_at'] = dateRef;
    }

    if (targetCheck === null) {
        core.info(`Check run ${targetName} not found. Creating it...`);
        await client.rest.checks.create({
          ...parameters
        });
    } else {
        core.info(`Found check run ${targetCheck.name}. Modifiying it...`);
        await client.rest.checks.update({
          check_run_id: targetCheck.id,
          ...parameters
      });
    }
  } catch (e) {
    core.error(e);
    core.setFailed(e.message);
  }
}

run();