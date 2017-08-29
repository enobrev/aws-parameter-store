# aws-parameter-store
Wrapper around AWS Parameter Store SDK Methods for use with App Configuration

## Usage

This will take all vars in `/production/shared` and `/production/api` and combine them into a single json object, saved as `.config.production.api.json`


```

import ParameterStore from '../src/ParameterStore';
import fs from 'fs';
import deepmerge from 'deepmerge';

const ENVIRONMENT = 'production';

ParameterStore.setConfig(process.env.AWS_KEY, process.env.AWS_SECRET, process.env.AWS_REGION);

writeConfig('api');

function writeConfig(sApp) {
    let sOutput = './.' + ['config', ENVIRONMENT, sApp, 'json'].join('.');

    ParameterStore.objectFromPath([ENVIRONMENT, 'shared'].join('/'), (oError, oShared) => {
        ParameterStore.objectFromPath([ENVIRONMENT, sApp].join('/'), (oError, oEnobrev) => {
            fs.writeFileSync(sOutput, JSON.stringify(deepmerge(oShared, oEnobrev), null, '   '));
        });
    });
}
```
