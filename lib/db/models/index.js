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
import Note from "./note";
import NpsTemplate from "./nps-template";
import NpsCampaign from "./nps-campaign";
import NpsResponse from "./nps-response";
import TaskTemplate from "./task-template";
import Task from "./task";
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
  NpsCampaign,
  NpsResponse,
  NpsTemplate,
  Task,
  TaskTemplate,
  TeamMember,
  TimeEntry,
  TimerSession,
  User,
};
