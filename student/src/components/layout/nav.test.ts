import {describe,expect,it} from "vitest";
import {NAV,studentSections,activeHref} from "./nav";

describe("student navigation",()=>{
 it("contains only a student portal without repeated links",()=>{
   expect(Object.keys(NAV)).toEqual(["student"]);
   const links=NAV.student.map(item=>item.href);
   expect(new Set(links).size).toBe(links.length);
 });
 it("groups all student learning and commerce features",()=>{
   expect(studentSections.map(group=>group.label)).toEqual(["OVERVIEW","LEARNING","COMMUNITY","MARKETPLACE","ACCOUNT"]);
   expect(NAV.student.map(item=>item.href)).toEqual([
     "/dashboard","/classes","/syllabus","/schedule","/recordings","/library","/materials","/assessments","/report-card",
     "/messages","/forum","/store","/purchases","/rewards","/profile","/settings"
   ]);
 });
 it("marks nested class and recording routes as active",()=>{
   expect(activeHref(NAV.student,"/classes/test/recordings/one")).toBe("/classes");
   expect(activeHref(NAV.student,"/recordings")).toBe("/recordings");
   expect(activeHref(NAV.student,"/unlisted")).toBeNull();
 });
});
