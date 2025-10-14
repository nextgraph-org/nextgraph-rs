#!/usr/bin/env node
import { program } from "commander";
import { build } from "./build.js";
program
    .name("NG-ORM")
    .description("CLI to some JavaScript string utilities")
    .version("0.1.0");
program
    .command("build")
    .description("Build contents of a shex folder into Shape Types")
    .option("-i, --input <inputPath>", "Provide the input path", "./.shapes")
    .option("-o, --output <outputPath>", "Provide the output path", "./.orm")
    .option("-b, --baseIRI <baseIri>", "The base IRI for anonymous shapes", "https://nextgraph.org/shapes#")
    .action(build);
program.parse();
