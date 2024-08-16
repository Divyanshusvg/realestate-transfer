import mongoose, { Schema } from "mongoose";
import { PropType } from "./propertyType.modal.js";
import { User } from "./user.model.js";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
// PostAd Schema

const postAdSchema = new Schema({
  propertyLocation: {
    number: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    additionalInfo: { type: String },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  ownerId:{type: Schema.Types.ObjectId, ref: 'User', required: true},
  propertyType: { type: Schema.Types.ObjectId, ref: 'PropType', required: true },
  area: { type: Number, required: true }, // in square meters
  propertyName:{type:String,required:true},
  width:{type:Number},
  length:{type:Number},
  salePrice: { type: Number, required: true },
  propertyDescription: { type: String, required: true },
  photos: [{ type: String }], // Array of URLs or file paths to photos
  video: { type: String }, // URL or file path to video (optional)
  sellerContact: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: {type: String,required: true }
  },
  numberOfRoom:{type:Number},
  numberOfBathrooms:{type:Number},
  otherFeatures:{
    elevator:{type:Boolean},
    parking:{type:Number},
    garage:{type:Boolean},
    cellar:{type:Boolean}
  },
  propertyTax:{type:Number},
  condominiumFees:{type:Number},
  BalconyTerrace:{
    numberOfBalconyOrTerrace:{type:Number},
    areaOfBalconyOrTerrace:{type:Number},
  },
  land:{
    area:{type:Number}
  },
}, { timestamps: true });
postAdSchema.plugin(mongooseAggregatePaginate)
const PropertyAdd = mongoose.model("PropertyAdd", postAdSchema);
export default PropertyAdd;
