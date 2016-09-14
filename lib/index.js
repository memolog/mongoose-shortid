var mongoose = require('mongoose');
var ShortId = require('./shortid');

// Must use mongoose version 4.x
var defaultSave = mongoose.Model.prototype.save;
mongoose.Model.prototype.save = function(options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = undefined;
  }

  if (!options) {
    options = {};
  }

  for (key in this.schema.tree) {
    var fieldName = key
    if (this.isNew && this[fieldName] === undefined) {
        var idType = this.schema.tree[fieldName];

        if (idType === ShortId || idType.type === ShortId) {
            var idInfo = this.schema.path(fieldName);
            var retries = idInfo.retries;
            var self = this;
            function attemptSave() {
                idInfo.generator(idInfo.generatorOptions, function(err, id) {
                    if (err) {
                        if (cb) {
                            cb(err);
                        }
                        return;
                    }
                    self[fieldName] = id;
                    defaultSave.call(self, options, function(err, obj) {
                        if (err &&
                            err.code == 11000 &&
                            err.err.indexOf(fieldName) !== -1 &&
                            retries > 0
                        ) {
                            --retries;
                            attemptSave();
                        } else {
                            // TODO check these args
                            if (cb) {
                                cb(err, obj);
                            }
                        }
                    });
                });
            }
            attemptSave();
            return;
        }
    }
  }
  defaultSave.call(this, options, cb);
};

module.exports = exports = ShortId;
