"use strict";

const API_VERSION = 1;
const THIRD_PARTY_EXTENSIONS_ENABLED = false;

const officialTemplateProvider = Object.freeze({
  id: "goodecode.official.canonical-2.1",
  apiVersion: API_VERSION,
  create(projectName) {
    return {
      manifest: `name = "${projectName}"\nentry = "src/main.goode.py"\ntemplate_version = "2.1"\ntarget = "compatible-v5"\n`,
      files: {
        "src/main.goode.py": `# Goodecode canonical project template 2.1
# @goodecode.template: 2.1

def configure_project(ctx):
    ctx.project_title("${projectName}")

def configure_robot(ctx):
    pass

def configure_autonomous(ctx):
    ctx.auton_slot(name="Slot 1")
    ctx.auton_slot(name="Slot 2")
    ctx.auton_slot(name="Slot 3")
    ctx.auton_slot(name="Slot 4")

def configure_controls(ctx):
    pass
`,
      },
    };
  },
});

function templateProviders() { return [officialTemplateProvider]; }
function registerTemplateProvider() {
  if (!THIRD_PARTY_EXTENSIONS_ENABLED) throw new Error("Third-party Goodecode providers are not enabled in this release.");
}

module.exports = { API_VERSION, THIRD_PARTY_EXTENSIONS_ENABLED, templateProviders, registerTemplateProvider };
