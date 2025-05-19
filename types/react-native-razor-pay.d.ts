declare module 'react-native-razorpay' {
  interface RazorpayOptions {
    description: string;
    image?: string;
    currency: string;
    key: string;
    amount: number | string;
    name: string;
    order_id: string;
    prefill?: {
      email?: string;
      contact?: string;
      name?: string;
    };
    theme?: {
      color?: string;
    };
  }

  interface RazorpayCheckout {
    open(options: RazorpayOptions): Promise<any>;
  }

  const RazorpayCheckout: RazorpayCheckout;

  export default RazorpayCheckout;
}
