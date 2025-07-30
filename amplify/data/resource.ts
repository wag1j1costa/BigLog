import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  // Model para configurações das transportadoras
  CarrierSettings: a
    .model({
      carrierName: a.string().required(), // "correios", "mercadolivre", etc
      apiUser: a.string(),
      apiPassword: a.string(),
      contractNumber: a.string(),
      postageCard: a.string(),
      administrativeCode: a.string(),
      isActive: a.boolean().required().default(true),
    })
    .authorization((allow) => [
      allow.owner(), // Apenas o dono pode ver/editar
      allow.groups(["Admins"]) // Admins podem ver/editar tudo
    ]),

  // Model para as etiquetas geradas
  ShippingLabel: a
    .model({
      trackingCode: a.string().required(),
      carrier: a.string().required(), // "correios", "mercadolivre", etc
      
      // Dados do destinatário
      recipientName: a.string().required(),
      recipientCPF: a.string(),
      recipientAddress: a.string().required(),
      recipientCity: a.string().required(),
      recipientState: a.string().required(),
      recipientZipCode: a.string().required(),
      
      // Dados do remetente
      senderName: a.string().required(),
      senderAddress: a.string().required(),
      senderCity: a.string().required(),
      senderState: a.string().required(),
      senderZipCode: a.string().required(),
      
      // Dimensões e peso
      weight: a.float(),
      height: a.float(),
      width: a.float(),
      length: a.float(),
      
      // Informações do serviço
      serviceType: a.string().required(), // PAC, SEDEX, etc
      declaredValue: a.float(),
      status: a.string().required().default("created"), // created, printed, shipped, delivered, cancelled
      labelUrl: a.string(),
      
      createdBy: a.string().required(), // email do usuário
    })
    .authorization((allow) => [
      allow.owner(), // Usuário vê suas próprias etiquetas
      allow.groups(["Admins"]) // Admins veem todas
    ]),

  // Model para estatísticas do admin
  AdminStats: a
    .model({
      totalUsers: a.integer().required().default(0),
      totalLabels: a.integer().required().default(0),
      labelsByCarrier: a.json(), // {"correios": 150, "mercadolivre": 50}
      lastUpdated: a.datetime(),
    })
    .authorization((allow) => [
      allow.groups(["Admins"]) // Apenas admins podem acessar
    ]),

  // Remova ou comente o Todo model se não precisar mais
  // Todo: a
  //   .model({
  //     content: a.string(),
  //   })
  //   .authorization((allow) => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool", // Mudando para autenticação de usuário
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});