var mongoose = require('mongoose'),
  mongoose_auth = require('mongoose-auth'),
  Schema = mongoose.Schema;

var TimeMapSchema = new Schema({
  json: String
});

var TimeMap = mongoose.model('TimeMap', TimeMapSchema);

exports.TimeMap = TimeMap;