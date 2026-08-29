import { onRequestGet as __api_management_overview_js_onRequestGet } from "C:\\xampp\\htdocs\\3D game\\functions\\api\\management\\overview.js"
import { onRequestOptions as __api_management_overview_js_onRequestOptions } from "C:\\xampp\\htdocs\\3D game\\functions\\api\\management\\overview.js"
import { onRequestPatch as __api_management_overview_js_onRequestPatch } from "C:\\xampp\\htdocs\\3D game\\functions\\api\\management\\overview.js"
import { onRequestGet as __api_leaderboard_js_onRequestGet } from "C:\\xampp\\htdocs\\3D game\\functions\\api\\leaderboard.js"
import { onRequestOptions as __api_leaderboard_js_onRequestOptions } from "C:\\xampp\\htdocs\\3D game\\functions\\api\\leaderboard.js"
import { onRequestPost as __api_leaderboard_js_onRequestPost } from "C:\\xampp\\htdocs\\3D game\\functions\\api\\leaderboard.js"
import { onRequestGet as __api_login_js_onRequestGet } from "C:\\xampp\\htdocs\\3D game\\functions\\api\\login.js"
import { onRequestPost as __api_login_js_onRequestPost } from "C:\\xampp\\htdocs\\3D game\\functions\\api\\login.js"
import { onRequestPost as __api_logout_js_onRequestPost } from "C:\\xampp\\htdocs\\3D game\\functions\\api\\logout.js"
import { onRequestGet as __api_register_js_onRequestGet } from "C:\\xampp\\htdocs\\3D game\\functions\\api\\register.js"
import { onRequestOptions as __api_register_js_onRequestOptions } from "C:\\xampp\\htdocs\\3D game\\functions\\api\\register.js"
import { onRequestPost as __api_register_js_onRequestPost } from "C:\\xampp\\htdocs\\3D game\\functions\\api\\register.js"
import { onRequestGet as __api_session_js_onRequestGet } from "C:\\xampp\\htdocs\\3D game\\functions\\api\\session.js"
import { onRequest as ___middleware_js_onRequest } from "C:\\xampp\\htdocs\\3D game\\functions\\_middleware.js"

export const routes = [
    {
      routePath: "/api/management/overview",
      mountPath: "/api/management",
      method: "GET",
      middlewares: [],
      modules: [__api_management_overview_js_onRequestGet],
    },
  {
      routePath: "/api/management/overview",
      mountPath: "/api/management",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_management_overview_js_onRequestOptions],
    },
  {
      routePath: "/api/management/overview",
      mountPath: "/api/management",
      method: "PATCH",
      middlewares: [],
      modules: [__api_management_overview_js_onRequestPatch],
    },
  {
      routePath: "/api/leaderboard",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_leaderboard_js_onRequestGet],
    },
  {
      routePath: "/api/leaderboard",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_leaderboard_js_onRequestOptions],
    },
  {
      routePath: "/api/leaderboard",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_leaderboard_js_onRequestPost],
    },
  {
      routePath: "/api/login",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_login_js_onRequestGet],
    },
  {
      routePath: "/api/login",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_login_js_onRequestPost],
    },
  {
      routePath: "/api/logout",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_logout_js_onRequestPost],
    },
  {
      routePath: "/api/register",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_register_js_onRequestGet],
    },
  {
      routePath: "/api/register",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_register_js_onRequestOptions],
    },
  {
      routePath: "/api/register",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_register_js_onRequestPost],
    },
  {
      routePath: "/api/session",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_session_js_onRequestGet],
    },
  {
      routePath: "/",
      mountPath: "/",
      method: "",
      middlewares: [___middleware_js_onRequest],
      modules: [],
    },
  ]