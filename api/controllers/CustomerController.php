<?php
declare(strict_types=1);

final class CustomerController extends ResourceController
{
    public function __construct(PDO $conn)
    {
        parent::__construct($conn, 'customers', ResourceDefinitions::get('customers'));
    }
}
