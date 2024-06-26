import {
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaClient } from '@prisma/client';
import { PaginationDTO } from 'src/common';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);

  onModuleInit() {
    this.$connect();
    this.logger.log('Connected to the database');
  }

  create(createProductDto: CreateProductDto) {
    return this.product.create({
      data: createProductDto,
    });
  }

  async findAll(paginationDTO: PaginationDTO) {
    const { page, limit } = paginationDTO;

    const totalPages = await this.product.count({ where: { available: true } });
    const lastPage = Math.ceil(totalPages / limit);

    return {
      data: await this.product.findMany({
        where: { available: true },
        take: limit,
        skip: (page - 1) * limit,
      }),
      meta: {
        page: page,
        total: totalPages,
        lastPage: lastPage,
      },
    };
  }

  async findOne(id: number) {
    const resProduct = await this.product.findUnique({
      where: { id: id, available: true },
    });

    if (!resProduct) {
      throw new RpcException({
        message: `Product with id # ${id} not found`,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return {
      data: resProduct,
    };
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const { id: _, ...data } = updateProductDto;

    let updatedProduct;

    try {
      updatedProduct = await this.product.update({
        where: { id: id },
        data: data,
      });
    } catch (error) {
      throw new RpcException({
        message: `Product not found`,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    // if (!updatedProduct) {
    //   // console.log(`Product with id ${id} not found`);
    // }

    return {
      data: updatedProduct,
    };
  }

  async remove(id: number) {
    let product;

    try {
      product = await this.product.update({
        where: { id: id },
        data: { available: false },
      });
    } catch (error) {
      throw new RpcException({
        message: `Product not found`,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return product;
  }

  async validateProduct(ids: number[]) {

    ids = Array.from(new Set(ids)) 

    const products = await this.product.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    if (products.length !== ids.length) {
      throw new RpcException({
        message: `Some products were not found`,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return products;

  }
}
