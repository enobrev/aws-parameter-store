"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _awsSdk = require('aws-sdk');

var _awsSdk2 = _interopRequireDefault(_awsSdk);

var _deepmerge = require('deepmerge');

var _deepmerge2 = _interopRequireDefault(_deepmerge);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class ParameterStore {

    /**
     *
     * @param {String} sKey
     * @param {String} sSecret
     * @param {String} sRegion
     */
    static setConfig(sKey, sSecret, sRegion) {
        _awsSdk2.default.config.update({
            accessKeyId: sKey,
            secretAccessKey: sSecret,
            region: sRegion
        });
    }

    /**
     * The JS SDK does not properly pull the region from the credentials file.  It can be set with an ENV value (AWS_REGION) or just set it explicitly here
     * @param {String} sRegion
     */
    static setRegion(sRegion) {
        _awsSdk2.default.config.update({
            region: sRegion
        });
    }

    /**
     *
     * @return {SSM}
     * @private
     */
    static _getClient() {
        return new _awsSdk2.default.SSM();
    }

    /**
     *
     * @param {String} sParameter
     * @param {*} mValue
     * @param {String} sType
     * @param {Boolean} bOverwrite
     * @param {Function} fCallback
     */
    static put(sParameter, mValue, sType = ParameterStore.TYPE_STRING, bOverwrite = true, fCallback) {
        if (typeof sType === 'function') {
            fCallback = sType;
            sType = ParameterStore.TYPE_STRING;
        }

        if (typeof bOverwrite === 'function') {
            fCallback = bOverwrite;
            bOverwrite = true;
        }

        ParameterStore._getClient().putParameter(ParameterStore._createRecord(sParameter, mValue, sType, bOverwrite), fCallback);
    }

    /**
     *
     * @param {Array} aPaths
     * @param {Function} fCallback
     */
    static mergePathsAsObject(aPaths, fCallback) {
        _async2.default.parallel(aPaths.map(sPath => _async2.default.apply(ParameterStore.objectFromPath, sPath)), (oError, aResults) => {
            if (oError) {
                return fCallback(oError);
            }

            if (aResults.length === 1) {
                return fCallback(oError, aResults.pop());
            }

            fCallback(oError, _deepmerge2.default.all(aResults));
        });
    }

    /**
     *
     * @param {String} sParameter
     * @param {Function} fCallback
     */
    static get(sParameter, fCallback) {
        ParameterStore._getClient().getParameter({
            Name: sParameter,
            WithDecryption: true
        }, fCallback);
    }

    /**
     *
     * @param {String} sParameter
     * @param {Function} fCallback
     */
    static getValue(sParameter, fCallback) {
        ParameterStore.get(sParameter, (oError, oParameter) => {
            if (oError) {
                return fCallback(oError);
            }

            fCallback(null, oParameter.Parameter.Value);
        });
    }

    /**
     *
     * @param {String} sPath
     * @param {Boolean} bStrip
     * @param {Function} fCallback
     */
    static objectFromPath(sPath, bStrip = true, fCallback) {
        if (typeof bStrip === 'function') {
            fCallback = bStrip;
            bStrip = true;
        }

        ParameterStore.getByPath(sPath, bStrip, (oError, oCollection) => {
            if (oError) {
                return fCallback(oError);
            }

            let oJoined = {};
            Object.keys(oCollection).map(sKey => {
                ParameterStore._assignByPath(oJoined, sKey, oCollection[sKey]);
            });

            fCallback(oError, oJoined);
        });
    }

    /**
     *
     * @param {String} sPath
     * @param {Boolean} bStrip
     * @param {Function} fCallback
     */
    static getByPath(sPath, bStrip = true, fCallback) {
        if (typeof bStrip === 'function') {
            fCallback = bStrip;
            bStrip = true;
        }

        sPath = '/' + sPath.replace(/^\/|\/$/g, '').replace() + '/';

        ParameterStore._collectByPath(sPath, (oError, aCollection) => {
            if (oError) {
                return fCallback(oError);
            }

            let oCollection = {};
            aCollection.map(oParameter => {
                const sName = bStrip ? oParameter.Name.replace(sPath, '') : oParameter.Name;
                oCollection[sName] = ParameterStore._hydrateValue(oParameter);
            });

            fCallback(oError, oCollection);
        });
    }

    /**
     *
     * @param {String} sPath
     * @param {Function} fCallback
     * @param {String} [sNextToken]
     * @param {Array} [aCollection]
     * @private
     */
    static _collectByPath(sPath, fCallback, sNextToken, aCollection) {
        if (!aCollection) {
            aCollection = [];
        }

        ParameterStore._getClient().getParametersByPath({
            Path: sPath,
            NextToken: sNextToken,
            Recursive: true,
            WithDecryption: true
        }, (oError, oResults) => {
            if (oError) {
                return fCallback(oError);
            }

            aCollection = aCollection.concat(oResults.Parameters);

            if (oResults.NextToken) {
                ParameterStore._collectByPath(sPath, fCallback, oResults.NextToken, aCollection);
            } else {
                fCallback(oError, aCollection);
            }
        });
    }

    /**
     *
     * @param {Object} oParameter
     * @return {Array|String|Boolean}
     * @private
     */
    static _hydrateValue(oParameter) {
        let sValue = oParameter.Type === ParameterStore.TYPE_STRING_LIST ? oParameter.Value.split(',') : oParameter.Value;

        // Boolean
        sValue = sValue === 'true' ? true : sValue;
        sValue = sValue === 'false' ? false : sValue;

        // Int
        sValue = /^-?\d+$/.test(sValue) ? parseInt(sValue, 10) : sValue;

        // Float
        sValue = /^-?\d*\.\d+$/.test(sValue) ? parseFloat(sValue) : sValue;

        return sValue;
    }

    /**
     *
     * @param {String} sParameter
     * @param {Function} fCallback
     */
    static delete_(sParameter, fCallback) {
        ParameterStore._getClient().deleteParameter({
            Name: sParameter
        }, fCallback);
    }

    /**
     *
     * @param {String} sParameter
     * @param {String} mValue
     * @param {String} sType
     * @param {Boolean} bOverwrite
     * @return {{Name: *, Type: string, Value: *, Overwrite: boolean}}
     * @private
     */
    static _createRecord(sParameter, mValue, sType = ParameterStore.TYPE_STRING, bOverwrite = true) {
        const aParameter = sParameter.split('/');
        const sEnvironment = aParameter[1];

        let aStored = {
            Name: sParameter,
            Type: sType,
            Value: mValue,
            Overwrite: bOverwrite
        };

        if (sType === ParameterStore.TYPE_STRING_SECURE) {
            aStored.KeyId = `alias/config/${sEnvironment}`;
        }

        return aStored;
    }

    /**
     *
     * @param {Object} oObject
     * @param {String|Array} mPath
     * @param {String} mValue
     * @param {String} [sSeparator]
     * @return {Object}
     * @private
     */
    static _assignByPath(oObject, mPath, mValue, sSeparator = '/') {
        let aKeys = mPath.split(sSeparator);

        for (let i = 0; i < aKeys.length - 1; i++) {
            if (oObject[aKeys[i]] === undefined) {
                oObject[aKeys[i]] = {};
            }

            oObject = oObject[aKeys[i]];
        }

        oObject[aKeys.pop()] = mValue;
    }
}
exports.default = ParameterStore;
ParameterStore.TYPE_STRING = 'String';
ParameterStore.TYPE_STRING_LIST = 'StringList';
ParameterStore.TYPE_STRING_SECURE = 'SecureString';
//# sourceMappingURL=ParameterStore.js.map