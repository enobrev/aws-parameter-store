# aws-parameter-store
Wrapper around AWS Parameter Store SDK Methods for use with App Configuration

## Usage

This will take all vars in `/production/shared` and `/production/api` and combine them into a single json object

```

import ParameterStore from '../src/ParameterStore';

ParameterStore.setRegion('us-east-1');
ParameterStore.mergePathsAsObject([
    '/production/shared',
    '/production/api'
], (oError, oResults) => console.log(JSON.stringify(oResults, null, '    ')));
```
