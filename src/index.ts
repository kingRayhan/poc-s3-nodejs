import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import express from "express";
import multer from "multer";
import crypto from "node:crypto";
import path from "node:path";
import * as yup from "yup";
import cors from "cors";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { pipeline } from "node:stream";

import { Redis } from "ioredis";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "*" }));

const multerMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 20, // 10MB
    files: 1,
  },
});

const s3Client = new S3Client({
  region: "ap-southeast-1",
  credentials: {
    accessKeyId: "",
    secretAccessKey: "",
  },
});

const redis = new Redis({
  host: "localhost",
  port: 6379,
});

const getFileSignedUrl = (key: string) => {
  const command = new GetObjectCommand({
    Bucket: "return0-test-bucket-test-11",
    Key: key,
  });
  return getSignedUrl(s3Client, command, {
    expiresIn: 30,
  });
};

app.get("/", async (req, res) => {
  const _res = await redis.lrange("posts", 0, -1);
  const _posts = await Promise.all(
    _res.map(async (post) => {
      const _post = JSON.parse(post);
      // _post.image = await getFileSignedUrl(_post.image);
      return _post;
    })
  );

  res.json({
    posts: _posts,
  });
});

app.post("/", multerMiddleware.single("image"), async (req, res) => {
  const schema = yup.object({
    caption: yup.string().required(),
    image: yup.mixed().required(),
  });

  try {
    const uuid = crypto.randomUUID();
    const _body = await schema.validate({ ...req.body, image: req.file });

    // file size validation

    // shape optimization

    const fileKey = `images/${uuid}${path.extname(req.file?.originalname!)}`;

    const command = new PutObjectCommand({
      Bucket: "return0-test-bucket-test-11",
      Key: fileKey,
      Body: req.file?.buffer,
      ContentType: req.file?.mimetype,
    });

    await s3Client.send(command);

    await redis.lpush(
      "posts",
      JSON.stringify({ uuid, caption: _body.caption, image: fileKey })
    );

    res.json({
      message: "post created successfully",
      uuid,
    });
  } catch (error) {
    res.status(400).json({
      error,
    });
  }
});

app.get("/files/*", async (req, res) => {
  try {
    const key = req.params[0];
    const command = new GetObjectCommand({
      Bucket: "return0-test-bucket-test-11",
      Key: key,
    });
    const response = await s3Client.send(command);
    // const stream = response.Body?.transformToWebStream();
    // stream?.pipeTo(res.write);

    res.setHeader("Content-Type", response.ContentType!);
    res.setHeader("Content-Length", response.ContentLength!.toString());
    pipeline(response.Body?.transformToWebStream!, res, (err) => {
      if (err) {
        console.log(err);
      }
    });
  } catch (error) {
    res.status(404).json({
      error,
    });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
