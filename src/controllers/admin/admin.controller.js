import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { User } from "../../models/user.model.js";
import jwt from "jsonwebtoken";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { PropType } from "../../models/propertyType.modal.js";
import mongoose from "mongoose";
import PropertyAdd from "../../models/propertyAdd.modal.js";
import { SubCategory } from "../../models/propSubCategory.modal.js";
import moment from "moment";

const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

const dashboredAdmin = asyncHandler(async (req, res) => {
  const count = await User.countDocuments();
  const PropertyAddCount = await PropertyAdd.countDocuments();
  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const endOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1
  );

  const propertiesAddedTodayCount = await PropertyAdd.countDocuments({
    createdAt: { $gte: startOfDay, $lt: endOfDay },
  });
  return res.render("pages/dashbored", {
    count,
    PropertyAddCount,
    propertiesAddedTodayCount,
    currentPage: "dashboard",
  });
});

const getLoginAdmin = async (req, res) => {
  try {
    let { accessToken } = req.cookies;
    try {
      let decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
      req.user = await User.findOne({ _id: decoded });
      if (req.user.userType == 3) {
        return res.redirect("/");
      } else {
        return res.render("pages/login", { error: null });
      }
    } catch (error) {
      return res.render("pages/login", { error: null });
    }
  } catch (error) {
    return res.render("pages/login", { error: null });
  }
};
const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    return new ApiError(400, "email is required");
  }

  const user = await User.findOne({
    $or: [{ email }],
  });

  if (!user || user?.userType != 3) {
    return res.render("pages/login", { error: { email: "Invalid email" } });
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    return res.render("pages/login", {
      error: { password: "Invalid password" },
      old: { email },
    });
  }

  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: false,
  };
  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options);

  return res.redirect("/");
});

const logoutAdmin = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.admin._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .redirect("/login");
});

const propertyTypeCreate = asyncHandler(async (req, res) => {
  const { name, status, editId, del } = req.body;
  if (del == 1 || del == "1") {
    const propertyType = await PropType.findOneAndDelete({ _id: editId });
    return res
      .status(200)
      .json(
        new ApiResponse(200, propertyType, "PropertyType Deleted successfully")
      );
  } else if (editId) {
    const propertyType = await PropType.findOne({ _id: editId });
    if (!propertyType) {
      return res
        .status(404)
        .json(new ApiError(404, null, "PropertyType Not Found"));
    }
    if (name !== undefined) {
      propertyType.name = name;
    }
    if (status !== undefined) {
      propertyType.status = status;
    }
    await propertyType.save();
    return res
      .status(200)
      .json(
        new ApiResponse(200, propertyType, "PropertyType Updated successfully")
      );
  } else {
    const propertyType = await PropType.create({ name, status });
    return res
      .status(201)
      .json(
        new ApiResponse(201, propertyType, "PropertyType Created successfully")
      );
  }
});

const propTypeList = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, name } = req.query;

  // Build the match stage of the aggregation pipeline dynamically
  const matchStage = {};
  if (status !== undefined) {
    matchStage.status = status !== null ? status : { $ne: 0 };
  }
  if (name !== undefined) {
    matchStage.name = { $regex: new RegExp(name, "i") }; // Case-insensitive regex match
  }

  const aggregate = PropType.aggregate([
    {
      $match: matchStage,
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const propertyType = await PropType.aggregatePaginate(aggregate, options);

  return res
    .status(200)
    .render("pages/mangeProp", { propertyType, currentPage: "mangeProp" });
});

const userList = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, name } = req.query;

  // Build the match stage of the aggregation pipeline dynamically
  const matchStage = {
    userType: { $ne: 3 }, // Exclude users with userType 3 (Admin)
  };

  if (status !== undefined) {
    matchStage.status = status !== null ? status : { $ne: 0 };
  }
  if (name !== undefined) {
    matchStage.name = { $regex: new RegExp(name, "i") }; // Case-insensitive regex match
  }

  const aggregate = User.aggregate([
    {
      $match: matchStage,
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        password: 0, // Exclude password field
      },
    },
  ]);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const users = await User.aggregatePaginate(aggregate, options);

  return res
    .status(200)
    .render("pages/userList", { users, currentPage: "userList" });
});

const userDetails = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.query;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).render("404", { message: "User not found" });
    }
    // Adjust the path to your view file
    res.render("pages/userList/show", { user });
  } catch (error) {
    res.status(500).render("500", { message: "Server error" });
  }
});

const editDelUser = asyncHandler(async (req, res) => {
  const { userName, email, userType, editId, del } = req.body;
  if (del) {
    // Delete user
    try {
      const user = await User.findByIdAndDelete(editId);
      if (!user) {
        throw new ApiError(404, "User not found");
      }
      return res
        .status(200)
        .json(new ApiResponse(200, null, "User deleted successfully"));
    } catch (error) {
      throw new ApiError(500, "Server error");
    }
  } else if (editId) {
    // Edit user
    try {
      const updatedUser = await User.findByIdAndUpdate(
        editId,
        {
          $set: {
            userName: userName,
            email: email,
            userType: userType,
          },
        },
        { new: true } // Return the updated document
      ).select("-password -isAdmin -isVerified");
      if (!updatedUser) {
        return new ApiError(404, "User not found");
      }

      return res.status(200).json(
        new ApiResponse(200, {
          message: "User updated successfully",
          user: updatedUser,
        })
      );
    } catch (error) {
      return res.status(500).json({ message: "Server error", error });
    }
  } else {
    return res.status(400).json({ message: "Invalid request" });
  }
});

const filterUsersByVerification = asyncHandler(async (req, res) => {
  const { isVerified } = req.query; // "true" or "false"
  // Validate the isVerified parameter
  if (isVerified !== "true" && isVerified !== "false") {
    return res.status(400).json({ message: "Invalid isVerified value" });
  }

  // Construct the filter query based on isVerified
  const filterQuery = { isVerified: isVerified === "true" };

  try {
    const users = await User.find(filterQuery).select("-password");
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
});

const updateVerificationStatus = asyncHandler(async (req, res) => {
  const { userId, isVerified } = req.body;
  try {
    // Find user by ID and update verification status
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.isVerified = isVerified;
    await user.save();

    res.json({
      success: true,
      message: "Verification status updated successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const updateUser = asyncHandler(async (req, res) => {
  try {
    const { userName, email, userType, _id } = req.body;
    // Validate input
    if (!userName || !email || !userType || !_id) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    // Find user and update their information
    const user = await User.findOne({ _id });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // Update user details
    user.userName = userName;
    user.email = email;
    user.userType = userType;
    await user.save();

    res.json({
      success: true,
      message: "User information updated successfully!",
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

const getUserActivity = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  try {
    // Define the date format
    const formatDate = "YYYY-MM-DD";

    // Initialize variables for date range
    const startOfWeek = moment().startOf("week");
    const endOfWeek = moment().endOf("week");
    console.log("Start of Week:", startOfWeek.format(formatDate));
    console.log("End of Week:", endOfWeek.format(formatDate));

    // Generate a list of all required periods (days of the current week)
    const periodsOfTime = [];
    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    for (let i = 0; i < 7; i++) {
      const date = startOfWeek.clone().add(i, "days").format(formatDate);
      periodsOfTime.push({
        _id: date,
        day: daysOfWeek[i],
        totalProperties: 0, // Initialize with 0
      });
    }
    // Aggregation pipeline to count properties listed by the user daily
    const aggregationPipeline = [
      {
        $match: {
          ownerId: new mongoose.Types.ObjectId(userId),
          createdAt: {
            $gte: startOfWeek.toDate(),
            $lte: endOfWeek.toDate(),
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          totalProperties: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 }, // Sorting by date in ascending order
      },
    ];

    const aggregatedData = await PropertyAdd.aggregate(aggregationPipeline);

    // Convert aggregated data into a map for easy lookup
    const dataMap = aggregatedData.reduce((map, item) => {
      map[item._id] = item.totalProperties;
      return map;
    }, {});

    // Update periodsOfTime with actual data from aggregatedData
    periodsOfTime.forEach((period) => {
      if (dataMap[period._id] !== undefined) {
        period.totalProperties = dataMap[period._id];
      }
    });

    res.json(periodsOfTime);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Error fetching data", error });
  }
});

const resetPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  const adminId = req.admin._id;
  // Validate input
  if (!adminId || !newPassword) {
    return res
      .status(400)
      .json(
        new ApiError(400, null, ["Admin ID and new password are required"])
      );
  }

  try {
    // Find user by admin ID
    const user = await User.findById(adminId);
    if (!user) {
      return res.status(404).json(new ApiError(404, null, ["User not found"]));
    }
    // Update user's password
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    // Return success response
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password reset successfully"));
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json(new ApiError(500, null, ["Server error"]));
  }
});

const getPropertyList = asyncHandler(async (req, res) => {
  let { page, limit } = req.query;

  // Set default values if page or limit is not provided or is invalid
  page = parseInt(page, 10);
  limit = parseInt(limit, 10);
  if (isNaN(page) || page <= 0) {
    page = 1;
  }
  if (isNaN(limit) || limit <= 0) {
    limit = 10;
  }

  try {
    // Fetch properties for listing
    const options = {
      page,
      limit,
    };
    const aggregate = PropertyAdd.aggregate([
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $lookup: {
          from: "users", // Collection name
          localField: "ownerId", // Field in the property document
          foreignField: "_id", // Field in the users collection
          as: "owner_info", // New field to store the owner information
        },
      },
      {
        $lookup: {
          from: "subcategories", // Collection name
          localField: "propertySubCategory", // Field in the property document
          foreignField: "_id", // Field in the subcategories collection
          as: "category_info", // New field to store the category information
        },
      },
    ]);

    // Check if there are properties available
    const prop = await PropertyAdd.aggregatePaginate(aggregate, options);

    return res.status(200).render("pages/propertyList", { prop });
  } catch (error) {
    // Log the error for debugging
    console.error("Error fetching property list:", error);

    // Handle errors
    return new ApiError(500, "Internal Server Error");
  }
});

const editdelProperty = asyncHandler(async (req, res) => {
  try {
    const { id, propertyName, del } = req.body;
    if (del) {
      const propdeleted = await PropertyAdd.deleteOne({ _id: id });
      return res
        .status(200)
        .json(
          new ApiResponse(200, propdeleted, "Property Deleted successfully")
        );
    }
    const updatedProperty = await PropertyAdd.findByIdAndUpdate(
      id,
      { propertyName },
      { new: true }
    );

    if (!updatedProperty) {
      return res
        .status(404)
        .json(new ApiResponse(404, [], "Property not found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedProperty, "Property updated successfully")
      );
  } catch (error) {
    console.error("Error updating property:", error);
    return new ApiError(500, "Internal Server Error");
  }
});

const subPropertyTypeCreate = asyncHandler(async (req, res) => {
  const { name, status, catId, editId, del } = req.body;
  if (del == 1 || del == "1") {
    const subPropertyType = await SubCategory.findOneAndDelete({ _id: editId });
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subPropertyType,
          "Property Category Deleted successfully"
        )
      );
  } else if (editId) {
    const subPropertyType = await SubCategory.findOne({ _id: editId });
    if (!subPropertyType) {
      return res
        .status(404)
        .json(new ApiError(404, null, "Property Category Not Found"));
    }
    if (name !== undefined) {
      subPropertyType.name = name;
    }
    if (status !== undefined) {
      subPropertyType.status = status;
    }
    if (catId !== undefined) {
      subPropertyType.category = catId;
    }
    await subPropertyType.save();
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subPropertyType,
          "Property Category Updated successfully"
        )
      );
  } else {
    const subPropertyType = await SubCategory.create({
      name,
      status,
      category: catId,
    });
    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          subPropertyType,
          "Property Category Created successfully"
        )
      );
  }
});

const subPropCategoryTypeList = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, name } = req.query;

  // Build the match stage of the aggregation pipeline dynamically
  const matchStage = {};
  if (status !== undefined) {
    matchStage.status = status !== null ? status : { $ne: 0 };
  }
  if (name !== undefined) {
    matchStage.name = { $regex: new RegExp(name, "i") }; // Case-insensitive regex match
  }

  const aggregate = SubCategory.aggregate([
    {
      $match: matchStage,
    },
    {
      $lookup: {
        from: "proptypes",
        localField: "category",
        foreignField: "_id",
        as: "categoryDetails",
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const subPropertyType = await SubCategory.aggregatePaginate(
    aggregate,
    options
  );
  return res
    .status(200)
    .render("pages/subCategory", {
      subPropertyType,
      currentPage: "subCategory",
    });
});

const subscription = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, name } = req.query;

  // Build the match stage of the aggregation pipeline dynamically
  const matchStage = {};
  if (status !== undefined) {
    matchStage.status = status !== null ? status : { $ne: 0 };
  }
  if (name !== undefined) {
    matchStage.name = { $regex: new RegExp(name, "i") }; // Case-insensitive regex match
  }

  const aggregate = PropType.aggregate([
    {
      $match: matchStage,
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const subscription = await PropType.aggregatePaginate(aggregate, options);

  return res
    .status(200)
    .render("pages/subscription", {
      subscription,
      currentPage: "subscription",
    });
});

export {
  loginAdmin,
  logoutAdmin,
  getLoginAdmin,
  dashboredAdmin,
  updateVerificationStatus,
  propertyTypeCreate,
  propTypeList,
  userList,
  userDetails,
  editDelUser,
  filterUsersByVerification,
  updateUser,
  getUserActivity,
  resetPassword,
  getPropertyList,
  editdelProperty,
  subPropertyTypeCreate,
  subPropCategoryTypeList,
  subscription,
};
