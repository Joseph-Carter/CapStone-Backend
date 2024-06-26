import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  getUserById,
  getVideoByArchiveId,
  updateDatabaseWithVideoAndThumbnail,
} from "../queries/videos.js";

dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// uploads file to S3 bucket with metadata defaults
const uploadFileToS3 = async (filePath, s3Key, metadata, userEntry) => {
  const fileStream = fs.createReadStream(filePath);
  let contentType = 'video/mp4';
  if (s3Key.endsWith('png')){
    contentType = 'image/png';
  } else if (s3Key.endsWith('.jpg') || s3Key.endsWith('.jpeg')) {
    contentType = 'image/jpeg';
  }

  const uploadParams = {
    Bucket: process.env.BUCKET_NAME,
    Key: s3Key,
    Body: fileStream,
    Metadata: {
      title: metadata.title,
      summary: metadata.summary,
      category: metadata.category || "Default Category",
      isPrivate: metadata.is_private ? metadata.is_private.toString() : "false",
      source: metadata.source || "Vonage",
      user: JSON.stringify(userEntry),
    },
    ContentType: contentType,
  };

  try {
    const uploadResult = await s3Client.send(
      new PutObjectCommand(uploadParams)
    );
    console.log(`Successfully uploaded to S3: ${s3Key}`);
    return s3Key;
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw error;
  }
};

// deletes temporary download archive file for processing
const deleteFile = (filePath) => {
  try {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Error deleting file:", filePath, err);
      } else {
        console.log("File deleted successfully:", filePath);
      }
    });
  } catch (error) {
    console.error("Failed to delete file:", filePath, error);
  }
};

//  process temporary archive file
const processVideoData = async (req, res) => {
  const { archiveId } = req.params;
  const formData = req.body;
  // retrieves archiveId
  const videoDetails = await getVideoByArchiveId(archiveId);
  const userId = videoDetails.user_id;
  const userEntry = await getUserById(userId);

  if (!userEntry) {
    return res.status(404).json({ message: 'User not found with userId: ' + userId })
  }

  if (!videoDetails) {
    return res
      .status(404)
      .json({ message: "Video not found with archiveId: " + archiveId });
  }

  // santitizes all encoded characters and simplifies title and key configuration
  const sanitizedTitle = formData.title.replace(/[^a-zA-Z0-9-_]+/g, "-");
  const videoFilePath = path.join("videos", `${archiveId}.mp4`);
  const thumbnailFilePath = path.join("thumbnails", `${archiveId}.png`);

  try {
    const [videoS3Key, thumbnailS3Key] = await Promise.all([
      uploadFileToS3(videoFilePath, `user/${userId}/${sanitizedTitle}.mp4`, formData, userEntry),
      uploadFileToS3(thumbnailFilePath, `user/${userId}/${sanitizedTitle}.png`, formData, userEntry),
    ]);
// executes delets of temp video and thumbnail file
    deleteFile(videoFilePath);
    deleteFile(thumbnailFilePath);

    // updates thumbnail and video S3 keys to db
    const updatedRecord = await updateDatabaseWithVideoAndThumbnail(
      archiveId,
      videoS3Key,
      thumbnailS3Key,
      {
        ...formData,
        title: formData.title,
        summary: formData.summary,
        category: formData.category || "Default Category",
        is_private: formData.is_private || false,
        user: userEntry,
      }
    );
    console.log({
      "DB Update:": updatedRecord,
      "Video S3 Key:": videoS3Key,
      "Thumbnail S3 Key:": thumbnailS3Key,
    });
    res.json({
      message: "Video and thumbnail successfully uploaded and database updated",
      data: updatedRecord,
    });
  } catch (error) {
    console.error("Error during upload or database update:", error);
    res.status(500).json({
      message: "Failed to upload video and thumbnail and update database",
      error: error.toString(),
    });
  }
};

export {
  processVideoData
};





