import chalk from "chalk";

export class Logger {
  private static instance: Logger;
  private verbose: boolean = false;

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  public info(message: string): void {
    console.log(chalk.blue("ℹ"), message);
  }

  public success(message: string): void {
    console.log(chalk.green("✓"), message);
  }

  public warning(message: string): void {
    console.log(chalk.yellow("⚠"), message);
  }

  public error(message: string): void {
    console.log(chalk.red("✗"), message);
  }

  public debug(message: string): void {
    if (this.verbose) {
      console.log(chalk.gray("🔍"), chalk.gray(message));
    }
  }

  public log(message: string): void {
    console.log(message);
  }
}
