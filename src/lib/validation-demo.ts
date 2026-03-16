import { 
  validate, 
  validateEventData,
  isValid,
  createSchemaRegistry,
  registerSchema,
  createSchemaValidator,
  type Schema,
  type SchemaDefinition,
} from "the-base-event";

export const orderSchema: Schema = {
  type: "object",
  properties: {
    orderId: { type: "string" },
    userId: { type: "string" },
    total: { type: "number" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          productId: { type: "string" },
          quantity: { type: "number" },
          price: { type: "number" },
        },
        required: ["productId", "quantity", "price"],
      },
    },
    timestamp: { type: "number" },
  },
  required: ["orderId", "userId", "total", "items", "timestamp"],
};

export const userSchema: Schema = {
  type: "object",
  properties: {
    userId: { type: "string" },
    email: { type: "string" },
    name: { type: "string" },
    timestamp: { type: "number" },
  },
  required: ["userId", "email", "name", "timestamp"],
};

export const paymentSchema: Schema = {
  type: "object",
  properties: {
    orderId: { type: "string" },
    userId: { type: "string" },
    amount: { type: "number" },
    method: { 
      type: "enum", 
      values: ["credit_card", "paypal", "bank_transfer"] 
    },
    status: {
      type: "enum",
      values: ["success", "failed", "pending"],
    },
    timestamp: { type: "number" },
  },
  required: ["orderId", "userId", "amount", "method", "status", "timestamp"],
};

export const inventorySchema: Schema = {
  type: "object",
  properties: {
    productId: { type: "string" },
    productName: { type: "string" },
    currentStock: { type: "number" },
    threshold: { type: "number" },
    timestamp: { type: "number" },
  },
  required: ["productId", "productName", "currentStock", "threshold", "timestamp"],
};

export const createValidationRegistry = () => {
  const registry = createSchemaRegistry();
  
  const orderDef: SchemaDefinition = { channel: "order", schema: orderSchema };
  const userDef: SchemaDefinition = { channel: "user", schema: userSchema };
  const paymentDef: SchemaDefinition = { channel: "payment", schema: paymentSchema };
  const inventoryDef: SchemaDefinition = { channel: "inventory", schema: inventorySchema };
  
  registerSchema(registry, orderDef);
  registerSchema(registry, userDef);
  registerSchema(registry, paymentDef);
  registerSchema(registry, inventoryDef);
  
  return registry;
};

export const testOrderValidation = () => {
  const validOrder = {
    orderId: "ORD-001",
    userId: "user-123",
    total: 99.99,
    items: [
      { productId: "prod-1", quantity: 2, price: 29.99 },
      { productId: "prod-2", quantity: 1, price: 40.01 },
    ],
    timestamp: Date.now(),
  };
  
  const invalidOrder = {
    orderId: "ORD-002",
    total: 50.00,
    items: [{ productId: "prod-1" }],
  };
  
  const validResult = validate(validOrder, orderSchema);
  const invalidResult = validate(invalidOrder, orderSchema);
  
  return {
    validOrder,
    validResult: {
      isValid: isValid(validResult.valid, orderSchema),
      errors: validResult.errors,
    },
    invalidOrder,
    invalidResult: {
      isValid: isValid(invalidResult.valid, orderSchema),
      errors: invalidResult.errors,
    },
  };
};

export const testUserValidation = () => {
  const validUser = {
    userId: "user-456",
    email: "john@example.com",
    name: "John Doe",
    timestamp: Date.now(),
  };
  
  const invalidUser = {
    userId: "user-789",
    email: "not-an-email",
    name: "",
  };
  
  const validResult = validate(validUser, userSchema);
  const invalidResult = validate(invalidUser, userSchema);
  
  return {
    validUser,
    validResult: {
      isValid: isValid(validResult.valid, userSchema),
      errors: validResult.errors,
    },
    invalidUser,
    invalidResult: {
      isValid: isValid(invalidResult.valid, userSchema),
      errors: invalidResult.errors,
    },
  };
};

export const testEventDataValidation = () => {
  const validPayment = {
    orderId: "ORD-003",
    userId: "user-123",
    amount: 150.00,
    method: "credit_card",
    status: "success",
    timestamp: Date.now(),
  };
  
  const invalidMethod = {
    orderId: "ORD-004",
    userId: "user-123",
    amount: 100.00,
    method: "crypto",
    status: "success",
    timestamp: Date.now(),
  };
  
  const validResult = validateEventData(validPayment, paymentSchema);
  const invalidResult = validateEventData(invalidMethod, paymentSchema);
  
  return {
    validPayment,
    validResult: {
      isValid: isValid(validResult.valid, paymentSchema),
      errors: validResult.errors,
    },
    invalidMethod,
    invalidResult: {
      isValid: isValid(invalidResult.valid, paymentSchema),
      errors: invalidResult.errors,
    },
  };
};

export const testComplexValidation = () => {
  const orderWithNegativePrice = {
    orderId: "ORD-005",
    userId: "user-123",
    total: -10.00,
    items: [
      { productId: "prod-1", quantity: 2, price: -5.00 },
    ],
    timestamp: Date.now(),
  };
  
  const result = validate(orderWithNegativePrice, orderSchema);
  
  return {
    data: orderWithNegativePrice,
    result: {
      isValid: isValid(result.valid, orderSchema),
      errors: result.errors,
    },
  };
};

export const createOrderValidator = () => {
  return createSchemaValidator(orderSchema);
};
