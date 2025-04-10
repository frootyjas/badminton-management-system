const path = require('path');
const serveFile = require('../utils/fileUtils');
const User = require('../models/User');
const Court = require('../models/Court');
const { log, error } = console;
const { getAddressFromCoordinates } = require('../utils/addressUtils');
const { extractMunicipality, bataanMunicipalities } = require('../utils/municipalityExtractor');

exports.getSuperadminDashboard = (req, res, next) => {
  const filePath = path.resolve(__dirname, '../../build/superadmindashboard.html');
  serveFile(filePath, res, next);
};

// handle court approval or rejection and update the associated user's isCourtApproved field
exports.handleCourtApproval = async (req, res, next) => {
  const courtId = req.params.courtId;
  const action = req.params.action; // action will either be "approve" or "reject"

  try {
    // find the court by ID
    const court = await Court.findById(courtId);

    if (!court) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: 'Court not found'
      });
    }

    // update the court status based on the action
    if (action === 'approve') {
      court.status = 'approved';
      await court.save();

      // find the associated user and update the isCourtApproved field
      const user = await User.findById(court.user); // assuming court has a user field with the user ID
      if (user) {
        user.isCourtApproved = true;
        await user.save();
      }

      return res.status(200).json({
        success: true,
        code: 200,
        message: 'Court approved successfully'
      });
    } else if (action === 'reject') {
      court.status = 'rejected';
      await court.save();

      // find the associated user and update the isCourtApproved field
      const user = await User.findById(court.user); // assuming court has a user field with the user ID
      if (user) {
        user.isCourtApproved = false;
        await user.save();
      }

      return res.status(200).json({
        success: true,
        code: 200,
        message: 'Court rejection processed successfully'
      });
    } else {
      return res.status(400).json({
        success: false,
        code: 400,
        message: 'Invalid action specified'
      });
    }
  } catch (err) {
    error('Error handling court approval/rejection:', err);
    return res.status(500).json({
      success: false,
      code: 500,
      message: 'Internal Server Error'
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().populate('court');
    return res.status(200).json({
      success: true,
      code: 200,
      data: users
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    return res.status(500).json({
      success: false,
      code: 500,
      message: 'Internal Server Error'
    });
  }
};

exports.getCourtOwners = async (req, res) => {
  const { status, municipality } = req.query; // status can be "approved", "rejected", "pending", or undefined (for all)

  try {
    // validate the status if provided
    if (status && !['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: 'Invalid status. Please use "approved", "rejected", "pending", or leave it empty to fetch all.'
      });
    }

    // query the database based on status, or fetch all if status is not provided
    const query = status ? { status } : {};
    const courts = await Court.find(query).populate('user');

    const courtsWithAddresses = await Promise.all(
      courts.map(async (court) => {
        // if coordinates are available, fetch the address
        if (court.location && court.location.coordinates) {
          try {
            const fullAddress = await getAddressFromCoordinates(court.location.coordinates);
            console.log(fullAddress);

            const extractedMunicipality = extractMunicipality(fullAddress);

            // if the address contains a Bataan municipality, truncate the string to remove everything after the municipality
            let trimmedAddress = fullAddress;
            if (bataanMunicipalities.includes(extractedMunicipality)) {
              const municipalityIndex = fullAddress.indexOf(extractedMunicipality);
              trimmedAddress = fullAddress.substring(0, municipalityIndex + extractedMunicipality.length);
            }

            return { ...court.toObject(), address: trimmedAddress, municipality: extractedMunicipality };
          } catch (error) {
            return { ...court.toObject(), address: 'Address not found' }; // return with fallback address
          }
        }
        // if no coordinates, return the court object without an address
        return { ...court.toObject(), address: 'No coordinates provided' };
      })
    );

    // filter by municipality if provided
    const filteredCourts = municipality
      ? courtsWithAddresses.filter((court) => court.municipality === municipality)
      : courtsWithAddresses;

    return res.status(200).json({
      success: true,
      code: 200,
      data: filteredCourts
    });
  } catch (err) {
    console.error('Error fetching court owners:', err);
    return res.status(500).json({
      success: false,
      code: 500,
      message: 'Internal Server Error'
    });
  }
};

// add the new endpoint to get court details by courtId
exports.getCourtById = async (req, res) => {
  const { courtId } = req.params;

  try {
    // find the court by its ID
    const court = await Court.findById(courtId).populate('user');

    if (!court) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: 'Court not found'
      });
    }

    const { location, ...courtData } = court.toObject();

    let address = 'No coordinates provided';

    // if coordinates are available, fetch the address
    if (location && location.coordinates) {
      try {
        address = await getAddressFromCoordinates(location.coordinates);
        log(address);
      } catch (error) {
        address = 'Address not found'; // fallback if address can't be fetched
      }
    }

    return res.status(200).json({
      success: true,
      code: 200,
      data: { ...courtData, address }
    });
  } catch (err) {
    console.error('Error fetching court details:', err);
    return res.status(500).json({
      success: false,
      code: 500,
      message: 'Internal Server Error'
    });
  }
};
