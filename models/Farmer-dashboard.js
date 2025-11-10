const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  Product: String,
  Price: Number,
  Date: {type : Date},
});

module.exports = mongoose.model('Product', productSchema);
