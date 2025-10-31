import dotenv from "dotenv"; dotenv.config();
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { Server as SocketServer } from "socket.io";
import OpenAI from "openai";
import multer from "multer";

export { express, mongoose, cors, path, fileURLToPath, http, SocketServer, OpenAI, multer };
