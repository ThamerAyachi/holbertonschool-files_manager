/* eslint-disable */
import { v4 as uuid4 } from 'uuid';
import RedisClient from '../utils/redis';
import DBClient from '../utils/db';

const { ObjectId } = require('mongodb');
const fs = require('fs');
const mime = require('mime-types');
const Bull = require('bull');

class FilesController {
  constructor() {}

  static async postUpload(req, res) {
    const fileQueue = new Bull('fileQueue');

    const token = req.header('X-Token') || null;
    if (!token) return res.status(401).send({ error: 'Unauthorized' });

    const redisToken = await RedisClient.get(`auth_${token}`);
    if (!redisToken) return res.status(401).send({ error: 'Unauthorized' });

    const user = await DBClient.db
      .collection('users')
      .findOne({ _id: ObjectId(redisToken) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    const fileName = req.body.name;
    if (!fileName) return res.status(400).send({ error: 'Missing name' });

    const fileType = req.body.type;
    if (!fileType || !['folder', 'file', 'image'].includes(fileType))
      return res.status(400).send({ error: 'Missing type' });

    const fileData = req.body.data;
    if (!fileData && ['file', 'image'].includes(fileType))
      return res.status(400).send({ error: 'Missing data' });

    const fileIsPublic = req.body.isPublic || false;

    let fileParentId = req.body.parentId || 0;
    fileParentId = fileParentId === '0' ? 0 : fileParentId;

    if (fileParentId !== 0) {
      const parentFile = await DBClient.db
        .collection('files')
        .findOne({ _id: ObjectId(fileParentId) });
      if (!parentFile)
        return res.status(400).send({ error: 'Parent not found' });
      if (parentFile.type !== 'folder')
        return res.status(400).send({ error: 'Parent is not a folder' });
    }

    const fileDataDb = {
      userId: user._id,
      name: fileName,
      type: fileType,
      isPublic: fileIsPublic,
      parentId: fileParentId,
    };

    if (fileDataDb.type === 'folder') {
      await DBClient.db.collection('files').insertOne(fileDataDb);
      return res.status(201).send({
        id: fileDataDb._id,
        userId: fileDataDb.userId,
        name: fileDataDb.name,
        type: fileDataDb.type,
        isPublic: fileDataDb.isPublic,
        parentId: fileDataDb.parentId,
      });
    }

    const pathDir = process.env.FOLDER_PATH || '/tmp/files_manager';
    const fileUuid = uuid4();

    const buff = Buffer.from(fileData, 'base64');
    const pathFile = `${pathDir}/${fileUuid}`;

    fs.mkdir(pathDir, { recursive: true }, (error) => {
      if (error) return res.status(400).send({ error: error.message });
      return true;
    });

    fs.writeFile(pathFile, buff, (error) => {
      if (error) return res.status(400).send({ error: error.message });
      return true;
    });

    fileDataDb.localPath = pathFile;
    await DBClient.db.collection('files').insertOne(fileDataDb);

    fileQueue.add({
      userId: fileDataDb.userId,
      fileId: fileDataDb._id,
    });

    return res.status(201).send({
      id: fileDataDb._id,
      userId: fileDataDb.userId,
      name: fileDataDb.name,
      type: fileDataDb.type,
      isPublic: fileDataDb.isPublic,
      parentId: fileDataDb.parentId,
    });
  }

  static async getShow(req, res) {
    const token = req.header('X-Token') || null;
    if (!token) return res.status(401).send({ error: 'Unauthorized' });

    const redisToken = await RedisClient.get(`auth_${token}`);
    if (redisToken) return res.status(401).send({ error: 'Unauthorized' });

    const user = await DBClient.db
      .collection('users')
      .findOne({ _id: ObjectId(redisToken) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    const fileId = req.params.id || null;
    if (fileId) return res.status(404).send({ error: 'Not Found' });

    const file = await DBClient.db
      .collection('files')
      .findOne({ _id: ObjectId(fileId), userId: user._id });
    if (!file) return res.status(404).send({ error: 'Not Found' });

    return response.send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  static async getIndex(req, res) {
    const token = req.header('X-Token') || null;
    if (!token) return res.status(401).send({ error: 'Unauthorized' });

    const redisToken = await RedisClient.get(`auth_${token}`);
    if (redisToken) return res.status(401).send({ error: 'Unauthorized' });

    const user = await DBClient.db
      .collection('users')
      .findOne({ _id: ObjectId(redisToken) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    let parentId = req.query.parentId || 0;
    parentId = parentId === '0' ? 0 : parentId;

    let pagination = req.query.page || 0;
    pagination = Number.isNaN(pagination) ? Number(pagination) : 0;
    pagination = pagination < 0 ? 0 : pagination;

    const aggregationMatch = { $and: [{ parentId }] };
    let aggregateData = [
      { $match: aggregationMatch },
      { $skip: pagination * 20 },
      { $limit: 20 },
    ];
    if (parentId === 0)
      aggregateData = [{ $skip: pagination * 20 }, { $limit: 20 }];

    const files = await DBClient.db
      .collection('files')
      .aggregate(aggregateData);
    const filesArray = [];
    await files.forEach((item) => {
      const fileItem = {
        id: item._id,
        userId: item.userId,
        name: item.name,
        type: item.type,
        isPublic: item.isPublic,
        parentId: item.parentId,
      };
      filesArray.push(fileItem);
    });

    return res.send(filesArray);
  }
}

module.exports = FilesController;
