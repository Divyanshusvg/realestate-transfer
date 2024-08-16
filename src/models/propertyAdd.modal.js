import mongoose, { Schema } from "mongoose";
import { PropType } from "./propertyType.modal.js";
import { User } from "./user.model.js";
import SubCategory from "./propSubCategory.modal.js";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import moment from 'moment';
const { defineLocale } = moment;
const propertyAddress=new Schema({
    address:{type: String,required:true},
    street:{type: String,required:true},
    streetNumber:{type: String,required:true},
    city:{type: String,required:true},
    postalCode:{type: Number,required:true},
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
})


const balcony=new Schema({
    noOfBalcony:{type:String,required:true},
    areaOfBalcony:{type:String,required:true},
})
const terrace=new Schema({
    noOfterrace:{type:String,required:true},
    areaOfterrace:{type:String,required:true},
})
const sellerContact=new Schema({
    firstName:{type:String,required:true},
    lastName:{type:String,required:true},
    email:{type:String,required:true},
    phoneNumber:{type:Number,required:true},
    address:{type:String,required:true},
    street:{type:String,required:true},
    streetNumber:{type:String,required:true},
    city:{type:String,required:true},
    postalCode:{type:String,required:true},
    
})

const imageSchema = new Schema({
    imageId: { type: String, required: true }
});

const videoSchema = new Schema({
    videoId: { type: String, required: true }
});


const postAdSchema = new Schema({
    //Common fields
    ownerId:{type: Schema.Types.ObjectId, ref: 'User', required: true},
    propertyType: { type: Schema.Types.ObjectId, ref: 'PropType', required: true },
    propertySubCategory:{type: Schema.Types.ObjectId, ref: 'SubCategory', required: true},
    area:{type:String,required:true},
    propertyName:{type:String,required:true},
    propertyAddress:{type: propertyAddress,required: true},
    propertySalePrice:{type: String ,required:true},
    propertyDescription:{type:String ,required:true},
    images: [imageSchema],
    videos: [videoSchema],
    //
    noOfBedroom:{type:String,default: null},
    noOfBathroom:{type:String,default: null},
    elevator:{type:Boolean,default: null},
    parking:{type:Boolean,default: null},
    garage:{type:String,default: null},
    noOfGarage:{type:String,default: null},
    areaOfGarage:{type:String,default: null},
    cellar:{type:String,default: null},
    noOfcellar:{type:String,default: null},
    areaOfcellar:{type:String,default: null},
    propertyTax:{type:String,default: null},
    yearOfConstruction:{type:String,default: null},
    condominiumFees:{type:String,default: null},
    proximityToService:{type:String,default: null},
    balcony:{type:balcony},
    terrace:{type:terrace},
    heatingType:{type:String,default: null},
    typeOfHeating: {type: String,enum: [null, '1', '2'],default: null}, // enum[individual,collective] 
    hotWaterType:{type:String,default: null},  // 
    typeOfhotWaterSystem:{type:String,default: null},
    garden:{type:Boolean,default: null},
    selleraddress:{type:sellerContact},
    floorNumber:{type:String,default: null},
    numberOfUnits:{type:String,default:null},
    numberOfFloors:{type:String,default:null},
    adjacentParking:{type:Boolean,default:null},
    availability:{type:Date,default:null},
    lastRenovationYear:{type:String,default: null},
    lastRenovationMonth:{type:String,default: null},
    securitySystem:{type:Boolean,default: null},
    commonEquipment:{type:Array,default: null},  //array
    centralHeating:{type:Boolean,default: null},
    noOfRooms:{type:String,default: null},
    airConditioning:{type:String,default: null},
    specificEquipment:{type:String,default: null},
    specificFeatures:{type:String,default: null}
}, { timestamps: true });

postAdSchema.plugin(mongooseAggregatePaginate)
const PropertyAdd = mongoose.model("PropertyAdd", postAdSchema);
export default PropertyAdd;