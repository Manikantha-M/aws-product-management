import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import {v4 as uuidv4} from 'uuid';
import { Product, ProductRecord } from "../../types/product";

// Initialize AWS Clients
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});
const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME;
const PRODUCT_IMAGES_BUCKET_NAME = process.env.PRODUCT_IMAGES_BUCKET_NAME;

export const handler = async (event:APIGatewayProxyEventV2):Promise<APIGatewayProxyResultV2> =>{
    console.log('Event', event);
    try {
        const productId = event.pathParameters?.id;
        if(!productId){
            return {
                statusCode:400,
                body:JSON.stringify({messgage: "product id is required"})
            };
        };
        let product:ProductRecord;
        try {
            const getResult = await docClient.send(new GetCommand({
                TableName: PRODUCTS_TABLE_NAME,
                Key:{id:productId}
            }));
            if(!getResult.Item){
                return {
                    statusCode: 404,
                    body: JSON.stringify({message:'Ptoduct Not Found'})
                }
            };
            product = getResult.Item as ProductRecord
        } catch (dynamoError) {
            console.error('Error retrieving product from dynamodb', dynamoError);
            return {
                statusCode:500,
                body:JSON.stringify({message:'Error Retrieving product from dynamo db'})
            };
        };

        if(product.imageUrl){
            try {
                const urlParts = product.imageUrl.split('/');
                const s3Key = urlParts.slice(3).join('/');
                await s3Client.send(
                    new DeleteObjectCommand({
                        Bucket:PRODUCT_IMAGES_BUCKET_NAME,
                        Key:s3Key
                    })
                );
                console.log('image deleted from S3', s3Key);
            } catch (s3Error) {
                console.error('Error deleting image from s3', s3Error);
            }
        };
        try {
            await docClient.send(
                new DeleteCommand({
                    TableName:PRODUCTS_TABLE_NAME,
                    Key:{id:productId}
                })
            );
            console.log('Product deleted from Dynamo DB', productId)
        } catch (dynamoError) {
            console.error('Error deleting the product from dynamodb', dynamoError);
            return {
                statusCode:500,
                body: JSON.stringify({message:"Failed to delete product"})
            }
        }

        return {
            statusCode:200,
            body:JSON.stringify({message:'deleted product successfully', productId})
        };
    } catch (error) {
        console.error(error, 'error deleting product');
        return {
        statusCode:500,
        body:JSON.stringify({message:'INTERNAL SERVER ERROR'})
        };
    }
    
}