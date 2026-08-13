from __future__ import annotations

import sys
from types import ModuleType

import pytest

from control_probe.adapters.evm import (
    AdapterConnectionError,
    AdapterDataError,
    EvmAdapter,
)
from control_probe.models import MetricSpec


class _Call:
    def __init__(self, value: int) -> None:
        self.value = value

    def call(self) -> int:
        return self.value


class _Functions:
    def totalSupply(self) -> _Call:
        return _Call(123000000)

    def balanceOf(self, _address: str) -> _Call:
        return _Call(45000000)


class _Contract:
    functions = _Functions()


class _Eth:
    def contract(self, **_kwargs: object) -> _Contract:
        return _Contract()


class _FakeWeb3:
    eth = _Eth()
    connected = True

    def __init__(self, _provider: object) -> None:
        pass

    @staticmethod
    def HTTPProvider(url: str) -> str:
        return url

    def is_connected(self) -> bool:
        return self.connected

    def is_address(self, value: str) -> bool:
        return value.startswith("0x")

    def to_checksum_address(self, value: str) -> str:
        return value


def _install_fake_web3(monkeypatch: pytest.MonkeyPatch, connected: bool = True) -> None:
    module = ModuleType("web3")

    class Web3(_FakeWeb3):
        pass

    Web3.connected = connected
    module.Web3 = Web3  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "web3", module)


def test_evm_adapter_resolves_erc20_metrics(monkeypatch: pytest.MonkeyPatch) -> None:
    _install_fake_web3(monkeypatch)
    adapter = EvmAdapter("http://localhost:8545")

    total_supply = adapter.resolve_metric(
        MetricSpec(
            id="total_supply",
            type="erc20_total_supply",
            address="0xtoken",
            decimals=6,
        )
    )
    reserve = adapter.resolve_metric(
        MetricSpec(
            id="reserve_balance",
            type="erc20_balance",
            address="0xreserve",
            token="0xtoken",
            decimals=6,
        )
    )

    assert total_supply == 123.0
    assert reserve == 45.0


def test_evm_adapter_resolves_parameter(monkeypatch: pytest.MonkeyPatch) -> None:
    _install_fake_web3(monkeypatch)
    adapter = EvmAdapter("http://localhost:8545", {"WINDOW": "0.1"})

    metric = MetricSpec(id="window", type="parameter", value="WINDOW")

    assert adapter.resolve_metric(metric) == 0.1


def test_evm_adapter_connection_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    _install_fake_web3(monkeypatch, connected=False)

    with pytest.raises(AdapterConnectionError):
        EvmAdapter("http://localhost:8545")


def test_evm_adapter_rejects_unimplemented_price(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _install_fake_web3(monkeypatch)
    adapter = EvmAdapter("http://localhost:8545")

    with pytest.raises(AdapterDataError, match="not implemented"):
        adapter.resolve_metric(MetricSpec(id="price", type="erc20_price"))


def test_evm_adapter_rejects_invalid_address(monkeypatch: pytest.MonkeyPatch) -> None:
    _install_fake_web3(monkeypatch)
    adapter = EvmAdapter("http://localhost:8545")

    with pytest.raises(AdapterDataError, match="invalid EVM address"):
        adapter.resolve_metric(
            MetricSpec(
                id="total_supply",
                type="erc20_total_supply",
                address="not-an-address",
                decimals=6,
            )
        )


def test_evm_adapter_rejects_parameter_without_value(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _install_fake_web3(monkeypatch)
    adapter = EvmAdapter("http://localhost:8545")

    with pytest.raises(AdapterDataError, match="must be numeric"):
        adapter.resolve_metric(MetricSpec(id="window", type="parameter"))


def test_evm_adapter_rejects_erc20_without_decimals(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _install_fake_web3(monkeypatch)
    adapter = EvmAdapter("http://localhost:8545")

    with pytest.raises(AdapterDataError, match="require decimals"):
        adapter.resolve_metric(
            MetricSpec(
                id="total_supply",
                type="erc20_total_supply",
                address="0xtoken",
            )
        )
