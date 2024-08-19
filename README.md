# pull-request-check-run-action
Create or modify a check run by name on the latest commit of a PR.

This action will search the head ref of the specified (or infered from context) PR for a check run with that name. If found it will be updated, if not found it will be created.

## Example usage
And then you can use the action in your jobs like this:

```
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: PauMAVA/pull-request-status-check-action@v1.0.0
        id: status
        with:
          name: 'ci/test'
          github_token: ${{ secrets.GITHUB_TOKEN }}
	  state: 'success'
```
## Inputs

| Input | Required? | Description |
| ----- | --------- | ----------- |
| repository | No | The repository where the Issue/PR is found |
| issue_number | No | The PR or Issue number where the check run will be introduced |
| github_token | No | The Github token to be used |
| name | Yes | This is displayed as the name of the check run |
| state | Yes | The status of the check run: action_required, cancelled, failure, neutral, success, skipped, timed_out |
| title | No | Short text explaining the check run |
| summary | No | Long description of the check run |
| target_url | No | The URL that will be linked in the check run |

On default the issue `issue_number`, `repository` and `github_token` are infered from the context. If one of the parameters could't be infered the action will fail.

## Outputs
Nothing.
