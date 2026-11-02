declare module 'africastalking' {
  interface SMSSendOptions {
    to: string[];
    message: string;
    from?: string;
  }

  interface SMSService {
    send(options: SMSSendOptions): Promise<unknown>;
  }

  interface AfricasTalkingInstance {
    SMS: SMSService;
  }

  interface AfricasTalkingOptions {
    apiKey: string;
    username: string;
  }

  function AfricasTalking(options: AfricasTalkingOptions): AfricasTalkingInstance;

  namespace AfricasTalking {}

  export = AfricasTalking;
}
