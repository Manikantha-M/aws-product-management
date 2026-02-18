import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {v4 as uuidv4} from 'uuid';
import { Product, ProductRecord } from "../../types/product";

// Initialize AWS Clients
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME;
export const handler = async (event:APIGatewayProxyEventV2):Promise<APIGatewayProxyResultV2> =>{
    console.log('Event', event);
    try {
        const scanResult = await docClient.send(new ScanCommand({
            TableName:PRODUCTS_TABLE_NAME
        }));
        const products: ProductRecord[] = (scanResult.Items as unknown as ProductRecord[] )|| [];
        products.sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        console.log(`Retrieved ${products.length} products from DynamoDB`);
        return {
        statusCode:200,
        body:JSON.stringify(products)
        };
    } catch (error) {
        console.error(error, 'error retrieving products');
        return {
        statusCode:200,
        body:JSON.stringify({message:'INTERNAL SERVER ERROR'})
        };
    }
    
}