<?php
declare(strict_types=1);

final class ShipperController extends ResourceController
{
    public function __construct(PDO $conn)
    {
        parent::__construct($conn, 'shippers', ResourceDefinitions::get('shippers'));
    }
}
