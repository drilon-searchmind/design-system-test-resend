/**
 * Register all Mongoose models for CRM / Agency OS.
 * Import side effects ensure schemas are compiled once.
 */
import Client from "./client";
import ClientDomain from "./client-domain";
import Contact from "./contact";
import Contract from "./contract";
import Department from "./department";
import KnowledgeArticle from "./knowledge-article";
import Notification from "./notification";
import Note from "./note";
import NpsInvite from "./nps-invite";
import NpsSendLog from "./nps-send-log";
import NpsSettings from "./nps-settings";
import NpsTemplate from "./nps-template";
import NpsCampaign from "./nps-campaign";
import NpsResponse from "./nps-response";
import TaskTemplate from "./task-template";
import Task from "./task";
import TaskComment from "./task-comment";
import TeamMember from "./team-member";
import TimeEntry from "./time-entry";
import TimerSession from "./timer-session";
import User from "./user";

export {
  Client,
  ClientDomain,
  Contact,
  Contract,
  Department,
  KnowledgeArticle,
  Note,
  Notification,
  NpsCampaign,
  NpsInvite,
  NpsResponse,
  NpsSendLog,
  NpsSettings,
  NpsTemplate,
  Task,
  TaskComment,
  TaskTemplate,
  TeamMember,
  TimeEntry,
  TimerSession,
  User,
};
