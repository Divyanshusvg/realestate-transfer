import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"

import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";
import otpService from '../utils/OtpServices.js'
import PropertyAdd from "../models/propertyAdd.modal.js";
import {PropType} from "../models/propertyType.modal.js";


const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { userName, email, password, userType} = req.body;
    if ([userName, email, password, userType].some(field => !field || field.trim() === "")) {
        return res.status(400).json(new ApiError(409, "All fields are required", ["All fields are required"]))
        // throw new ApiError(400, "All fields are required");
    }
    const existedUser = await User.findOne({ $or: [{ email }] });
    if (existedUser) {
        // throw new ApiError(409, "User with email  already exists");
        return res.status(409).json(new ApiError(409, "User with email already exists", ["User with email already exists"]))
    }
    const user = await User.create({
        userName, 
        email,
        password,
        userType
        
    });
    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken -isVerified -isAdmin")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        )

});

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body
    if (!email) {
        return res.status(400).json(new ApiError(400, "username or email is required", ["username or email is required"]))
    }
    const user = await User.findOne({
        $or: [{ email }]
    })

    if (!user) {
        return res.status(404).json(new ApiError(404, "User does not exist", ["User does not exist"]))
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        return res.status(401).json(new ApiError(401, "Invalid user credentials", ["Invalid user credentials"]))
    }
    if (!user.isVerified) {
        return res.status(403).json(new ApiError(403, "Account is not verified", ["Account is not verified"]))
        }
        
    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        )

})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")

        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefereshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        return new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(
            200,
            req.user,
            "User fetched successfully"
        ))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email , profileImage ,phone_no ,address } = req.body

   
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName:fullName,
                email: email,
                profileImage:profileImage,
                phone_no:phone_no,
                address:address
            }
        },
        { new: true }

    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))
});

const uploadImage = asyncHandler(async (req, res,) => {
    const files = req.files;
    if (!files || files.length === 0) {
        throw new ApiError(400, "No image files were uploaded");
    }
    // Map through the files and create an array of their URLs
    const fileUrls = files.map(file => `/temp/${file.filename}`);

    return res
        .status(200)
        .json(
            new ApiResponse(200, fileUrls, "Images uploaded successfully")
        );
});

const uploadvideo = asyncHandler(async (req, res,) => {
    const files = req.files;
    if (!files || files.length === 0) {
        throw new ApiError(400, "No Video files were uploaded");
    }
    // Map through the files and create an array of their URLs
    const fileUrls = files.map(file => `/temp/${file.filename}`);

    return res
        .status(200)
        .json(
            new ApiResponse(200, fileUrls, "Videos uploaded successfully")
        );
});


const addProperty = asyncHandler(async (req, res) => {
    const {
        ownerId,
        propertyType,
        propertySubCategory,
        area,
        propertyAddress,
        propertyName,
        propertySalePrice,
        propertyDescription,
        images,
        videos,
        noOfBedroom,
        noOfBathroom,
        elevator,
        parking,
        garage,
        noOfGarage,
        areaOfGarage,
        cellar,
        noOfcellar,
        areaOfcellar,
        propertyTax,
        yearOfConstruction,
        condominiumFees,
        proximityToService,
        balcony,
        terrace,
        heatingType,
        typeOfHeating,
        hotWaterType,
        typeOfhotWaterSystem,
        garden,
        selleraddress,
        floorNumber,
        numberOfUnits,
        numberOfFloors,
        adjacentParking,
        availability,
        lastRenovationYear,
        lastRenovationMonth,
        securitySystem,
        commonEquipment,
        centralHeating,
        noOfRooms,
        airConditioning,
        specificEquipment,
        specificFeatures
    } = req.body;

    const newProperty = await PropertyAdd.create({
        ownerId,
        propertyType,
        propertySubCategory,
        area,
        propertyAddress,
        propertySalePrice,
        propertyDescription,
        propertyName,
        images,
        videos,
        noOfBedroom,
        noOfBathroom,
        elevator,
        parking,
        garage,
        noOfGarage,
        areaOfGarage,
        cellar,
        noOfcellar,
        areaOfcellar,
        propertyTax,
        yearOfConstruction,
        condominiumFees,
        proximityToService,
        balcony,
        terrace,
        heatingType,
        typeOfHeating,
        hotWaterType,
        typeOfhotWaterSystem,
        garden,
        selleraddress,
        floorNumber,
        numberOfUnits,
        numberOfFloors,
        adjacentParking,
        availability,
        lastRenovationYear,
        lastRenovationMonth,
        securitySystem,
        commonEquipment,
        centralHeating,
        noOfRooms,
        airConditioning,
        specificEquipment,
        specificFeatures
    });
    const propertyWithDetails = await PropertyAdd.aggregate([
        { $match: { _id: newProperty._id } }, // Match the newly created property
        {
            $lookup: {
                from: "users", // Collection name
                localField: "ownerId", // Field in the property document
                foreignField: "_id", // Field in the users collection
                as: "owner_info" // New field to store the owner information
            }
        },
        {
            $lookup: {
                from: "subcategories", // Collection name
                localField: "propertySubCategory", // Field in the property document
                foreignField: "_id", // Field in the subcategories collection
                as: "category_info" // New field to store the category information
            }
        },
        {
            $project: {
                "owner_info.password": 0, // Exclude the password field
                "owner_info.isAdmin": 0,  // Exclude the isAdmin field if not needed
                "owner_info.__v": 0,      // Exclude the __v field
                "category_info.__v": 0,   // Exclude the __v field from category info
                "owner_info.updatedAt": 0, // Exclude unnecessary fields like updatedAt
                "owner_info.createdAt": 0, // Exclude unnecessary fields like createdAt
                "owner_info.isVerified": 0 // Exclude unnecessary fields like isVerified
            }
        }
    ]);
    return res.status(201).json(new ApiResponse(201, propertyWithDetails, "Property added successfully"));
});


const getAllProperties = asyncHandler(async (req, res) => {
    try {
        // Aggregation pipeline to fetch all properties
        const properties = await PropertyAdd.aggregate([
            {
                $match: {}  // Match all documents
            },
            {
                $project: {
                    __v: 0  // Exclude the __v field
                }
            }
        ]);
        // Check if there are properties available
        if (!properties.length) {
            return res.status(404).json(new ApiResponse(404, [], "No properties found"));
        }

        return res.status(200).json(new ApiResponse(200, properties, "Properties fetched successfully"));
    } catch (error) {
        // Handle errors
        return res.status(500).json(new ApiError(500, ["Internal Server Error"]));
    }
});

// Function to get all users with optional filters and pagination
const getPropertyType = asyncHandler(async (req, res) =>{
    try {
        const propertyTypes = await PropType.aggregate([
          {
            $match: {} // Add your matching criteria if needed
          }
        ]);
    
        return res.status(200).json(new ApiResponse(200,propertyTypes,"Properties fetched successfully"))
    }catch (error) {
        res.status(500).json(new ApiError(500,["Internal Server Error"]));
      }
});
    
const getSubcategories = asyncHandler(async (req, res) => {
    try {
        const { propertyTypeId } = req.body;

        const propertyWithSubcategories = await mongoose.model('PropType').aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(propertyTypeId),
                },
            },
            {
                $lookup: {
                    from: 'subcategories',            // The collection name of the subcategories
                    localField: '_id',                // The _id of the PropType
                    foreignField: 'category',         // The category field in SubCategory that references PropType _id
                    as: 'subcategories',              // The name of the array where matched documents will be stored
                },
            },
            {
                $project: {
                    subcategories: 1,                // Include the subcategories array in the final output
                },
            },
        ]);
        const subcategories = propertyWithSubcategories.length > 0 ? propertyWithSubcategories[0].subcategories : [];

        return res.status(200).json(new ApiResponse(200, subcategories, "Subcategories fetched successfully"));

    } catch (error) {
        return res.status(500).json(new ApiError(500, ["Internal Server Error"]));
    }
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    uploadImage,
    addProperty,
    getAllProperties,
    getPropertyType,
    getSubcategories,
    uploadvideo
}