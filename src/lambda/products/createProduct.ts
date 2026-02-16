import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {v4 as uuidv4} from 'uuid';
import { Product, ProductRecord } from "../../types/product";


// Initialize AWS Clients

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});
const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME;
const PRODUCT_IMAGES_BUCKET_NAME = process.env.PRODUCT_IMAGES_BUCKET_NAME;

export const handler = async (event:APIGatewayProxyEventV2):Promise<APIGatewayProxyResultV2> =>{
    console.log('Event Received', event);
    try {
        if(!event.body){
            return {
                statusCode: 400,
                body: JSON.stringify({message:'Request Body is required'})
            }
        };
        const product: Product = JSON.parse(event.body);
        if(!product.name || typeof product.price != 'number' || !product.description ||!product.imageData) {
            return {
                statusCode: 400,
                body: JSON.stringify({message:'All fields are required: name, description, price and image'})
            }
        };

        const prodcutId = uuidv4();
        const timestamp = new Date().toISOString();

        let imageUrl:string;
        try {
            console.log('starting S3 upload process')
        } catch (error) {
            
        }

        return {
            statusCode: 200,
            body: JSON.stringify({message:'create prodcut'})
        }

    } catch (error) {
        return {
            statusCode: 200,
            body: JSON.stringify({message:'create prodcut'})
        }
    }
}