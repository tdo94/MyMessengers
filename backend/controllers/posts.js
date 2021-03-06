const express = require('express');
const multer = require('multer');
const Post = require('../models/post');
const checkAuth = require('../middleware/check-auth');

const router = express.Router();

const MIME_TYPE_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isValid = MIME_TYPE_MAP[file.mimetype];
    let error = new Error("Invalid mime type");
    if (isValid) {
      error = null;
    }
    cb(error, "backend/images")
  },
  filename: (req, file, cb) => {
    const name = file.originalname.toLowerCase().split(' ').join('-');
    const ext = MIME_TYPE_MAP[file.mimetype];
    cb(null, name + '-' + Date.now() + '.' + ext)
  }
})

router.post('', checkAuth, multer({ storage }).single("image"), async (req, res) => {
  const url = req.protocol + '://' + req.get("host");
  const imagePath = url + "/images/" + req.file.filename;
  const { title, content } = req.body
  const creator = req.userData.userId;
  const post = new Post({ title, content, imagePath, creator })
  const createdPost = await post.save();
  res.status(201).json({
    message: "Post added successfully",
    post: {
      id: createdPost._id,
      title: createdPost.title,
      content: createdPost.content,
      imagePath: createdPost.imagePath,
      creator: createdPost.creator
    }
  })
})

router.put('/:id', checkAuth, multer({ storage }).single("image"), async (req, res) => {
  let { title, content, imagePath } = req.body;
  if (req.file) {
    const url = req.protocol + '://' + req.get("host");
    imagePath = url + "/images/" + req.file.filename;
  }
  const _id = req.params.id;
  try {
    if (_id !== "null") {
      const postToUpdate = await Post.findById(_id);
      if (!!postToUpdate) {
        //check authorization
        if (postToUpdate.creator.toString() !== req.userData.userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        //
        postToUpdate.title = title;
        postToUpdate.content = content;
        postToUpdate.imagePath = imagePath
        await Post.updateOne({ _id: req.params.id }, postToUpdate);
        return res.status(201).json({
          message: "Post updated",
          post: { id: postToUpdate._id, title, content, imagePath, creator: req.userData.userId }
        })
      }
    }
    return res.status(400).json({
      message: "No post found"
    })
  } catch (error) {
    res.status(500).json({
      message: "Server Error"
    })
  }
})

router.get('', async (req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  try {
    let posts;
    const maxPosts = await Post.countDocuments();
    if (!!pageSize && !!currentPage) {
      posts = await Post.find().skip(pageSize * (currentPage - 1)).limit(pageSize);
    } else {
      posts = await Post.find()
    }
    res.status(200).json({
      message: "Posts fetched successfully",
      posts: posts,
      maxPosts
    })
  } catch (error) {
    res.status(500).json({
      message: "Server Error"
    })
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    if (req.params.id !== "null") {
      const post = await Post.findById(req.params.id);
      if (!!post) {
        return res.status(200).json({
          message: "Post fetched successfully",
          post: post
        })
      }
    }
    return res.status(400).json({
      message: "No post found"
    })
  } catch (error) {
    res.status(500).json({
      message: "Server Error"
    })
  }
})

router.delete('/:id', checkAuth, async (req, res, next) => {
  try {
    if (req.params.id !== "null") {
      const postToRemove = await Post.findById(req.params.id);
      if (!!postToRemove) {
        //check authorization
        if (postToRemove.creator.toString() !== req.userData.userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        //
        await postToRemove.remove();
        return res.status(201).json({
          message: "Post deleted"
        })
      }
    }
    return res.status(400).json({
      message: "No post found"
    })
  } catch (error) {
    res.status(500).json({
      message: "Server Error"
    })
  }
})

module.exports = router;
